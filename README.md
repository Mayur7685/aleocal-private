# AleoCal — Zero-Knowledge Meeting Scheduler

> Find a common meeting time without revealing your calendar.

[![Aleo](https://img.shields.io/badge/Built%20on-Aleo-000000)](https://aleo.org)
[![Leo](https://img.shields.io/badge/Smart%20Contract-Leo-blue)](https://leo-lang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## What is AleoCal?

AleoCal lets two people find a shared meeting time using **zero-knowledge proofs** — neither party ever sees the other's full availability. Each person rates their 8 time slots (9 am – 5 pm) with a preference score (0 = unavailable, 1–4 = increasing preference). An on-chain ZK computation finds the slot with the highest combined score and reveals only that result.

### The privacy problem

Traditional scheduling tools (Calendly, Doodle, Google Calendar) require you to expose your entire schedule. That reveals:

- When you're busy (valuable intel to competitors, bad actors)
- Recurring patterns and habits
- Personal or confidential appointments

### The AleoCal solution

```
Host slots:   [2, 0, 3, 0, 1, 0, 4, 0]   ← never shared
Guest slots:  [1, 0, 2, 0, 3, 0, 2, 0]   ← never shared
                        ↓
          Element-wise product (ZK)
                        ↓
Scores:       [2, 0, 6, 0, 3, 0, 8, 0]
                        ↓
Result:       Slot 6 (4 pm–5 pm, score 8) ← only this is revealed
```

The computation runs inside a **Groth16 ZK circuit** deployed on Aleo Testnet. The slot inputs are private; only the winning slot and score are written to a public on-chain mapping.

---

## Live Demo

| Service | URL |
|---------|-----|
| Frontend | `https://aleocal-private.vercel.app` |
| Signaling server | `https://aleo-zk-server.onrender.com` |
| On-chain result explorer | `https://testnet.explorer.provable.com/transaction/{txId}` |

---

## User Flow

```
Host                                    Guest
 │                                        │
 ├─ Connect Shield / Leo wallet           ├─ Connect wallet
 │                                        │
 ├─ Create Meeting                        │
 │   └─ Random field ID generated         │
 │   └─ QR code + shareable link          │
 │       /?m={id}&h={hostAddress}         │
 │                                        │
 │                          ┌─────────────┤
 │                          │  Open link  │
 │                          │  or scan QR │
 │                          └─────────────┤
 │                                        ├─ Auto-join meeting room
 │◄── "Joiner Connected" badge ───────────┤
 │                                        │
 ├─ Select availability (8 slots, 0–4)   ├─ Select availability
 ├─ Submit → local ZK record created      ├─ Submit → slots sent via socket
 │                                        │
 ├─ Results page — "Guest is ready"       ├─ Results page — waiting
 │                                        │
 ├─ Click "Find Common Time"              │
 │   └─ wallet.executeTransaction()       │
 │       calmatchtwo.aleo::find_common_time│
 │   └─ Poll on-chain mapping             │
 │   └─ Broadcast result via socket  ────►│
 │                                        │
 ├─ Show best slot + ZK proof link        ├─ Show best slot + ZK proof link
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Host)                        │
│                                                          │
│  React UI ──► Aleo SDK Web Worker ──► Shield/Leo Wallet │
│                    (WASM / Groth16)                      │
└────────────────────────┬────────────────────────────────┘
                         │ Socket.io           │ executeTransaction
                         │                     │
              ┌──────────▼──────────┐   ┌──────▼──────────────┐
              │   zk-server          │   │   Aleo Testnet       │
              │   (Socket.io)        │   │   calmatchtwo.aleo   │
              │   Render             │   │   (public mappings)  │
              └──────────┬──────────┘   └──────────────────────┘
                         │ Socket.io
              ┌──────────▼──────────┐
              │   Browser (Guest)    │
              │   React UI           │
              └──────────────────────┘
```

**Key design decisions:**

- **ZK proofs run in the browser** via a Web Worker (WASM + `initThreadPool`). The main thread is never blocked.
- **Socket.io server is coordination-only** — it never sees calendar data. The host's slots stay local; the guest sends raw slot arrays via socket.
- **On-chain result** is stored in public mappings on `calmatchtwo.aleo`. Anyone can verify the computation without accessing either party's inputs.
- **Fallback chain**: Real Aleo SDK Worker → Mock SDK (if WASM unavailable).

---

## Deployed Contracts

### `calmatchtwo.aleo` — Active

| Field | Value |
|-------|-------|
| Network | Aleo Testnet |
| Deployment TX | `at12f08pp6reqlxf05zpyhsdrzv7wwycq4gk6hjy4r9rxlvq0c9gu8s47rjdc` |
| Function | `find_common_time(public meeting_id: field, host: Slots, guest: Slots)` |

**Slots struct input format:**
```
{ s0: 2u8, s1: 0u8, s2: 3u8, s3: 0u8, s4: 1u8, s5: 0u8, s6: 4u8, s7: 0u8 }
```

**Public mappings (queryable after finalization):**
```
meeting_results[{id}field]  →  best slot index (u8)
meeting_scores[{id}field]   →  best combined score (u8)
meeting_valid[{id}field]    →  whether any overlap exists (bool)
```

**Query example:**
```
GET https://api.explorer.provable.com/v2/testnet/program/calmatchtwo.aleo/mapping/meeting_valid/123field
→ "true"
```

### `privycalendar.aleo` — Legacy (local use only)

Used internally for client-side calendar record creation (`create_calendar`). Not called on-chain in the current flow.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| UI | Chakra UI 2 + Framer Motion |
| ZK computation | Aleo SDK 0.9.x (Web Worker + WASM) |
| Wallet | Shield Wallet + Leo Wallet via `@provablehq/aleo-wallet-adaptor-react` |
| Real-time | Socket.io 4.7 (client + server) |
| Signaling server | Node.js + Express + Socket.io on Render |
| Smart contracts | Leo language on Aleo Testnet |

---

## Repository Structure

```
aleo-aleocal/
├── aleocal/                         ← React frontend
│   ├── src/
│   │   ├── aleo/
│   │   │   ├── aleoWorker.ts        ← Web Worker (WASM init + SDK)
│   │   │   ├── aleoWorkerClient.ts  ← comlink wrapper, 12s timeout
│   │   │   ├── testnetClient.ts     ← SDK orchestration + mock fallback
│   │   │   ├── walletService.ts     ← buildFindCommonTimeOptions, pollMeetingResult
│   │   │   ├── meetingService.ts    ← Socket.io client wrapper
│   │   │   ├── computeIntersection.ts ← Local ZK fallback
│   │   │   ├── createCalendar.ts    ← privycalendar.aleo Leo source
│   │   │   ├── aleoConfig.ts        ← Env var loader
│   │   │   └── types.ts             ← TypeScript interfaces
│   │   ├── components/
│   │   │   ├── HomePage.tsx         ← Step 1: Intro
│   │   │   ├── ConnectWallet.tsx    ← Step 2: Wallet connection
│   │   │   ├── AddParticipants.tsx  ← Step 3: Create / join meeting + QR
│   │   │   ├── Calender.tsx         ← Step 4: Slot preference selector
│   │   │   ├── Results.tsx          ← Step 5: ZK computation + result
│   │   │   └── Final.tsx            ← Step 6: Confirmation
│   │   └── App.tsx                  ← Context + 6-step carousel
│   ├── aleo/
│   │   └── calmatchtwo/             ← Leo project (deployed)
│   │       └── src/main.leo
│   ├── vercel.json                  ← COOP/COEP headers for WASM
│   └── vite.config.ts               ← WASM plugins + dev headers
│
└── zk-server/                       ← Signaling server
    ├── server.js                    ← Express + Socket.io
    ├── package.json
    └── railway.toml
```

---

## Local Development

### Prerequisites

- Node.js 18+
- [Shield Wallet](https://shieldwallet.org) or [Leo Wallet](https://leo.app) browser extension connected to **Aleo Testnet**

### Setup

```bash
# Terminal 1 — Signaling server
cd zk-server
npm install
npm run dev
# → http://localhost:3030
```

```bash
# Terminal 2 — Frontend
cd aleocal
npm install
npm run dev
# → http://localhost:3006
```

### Environment variables

Copy `aleocal/.env.example` to `aleocal/.env`:

```env
VITE_SIGNALING_URL=http://localhost:3030
VITE_USE_MOCK_SDK=false
VITE_ALEO_NETWORK=testnet
VITE_ALEO_API_URL=https://api.explorer.provable.com/v2
VITE_CALMATCHTWO_PROGRAM_ID=calmatchtwo.aleo
VITE_CALMATCHTWO_TX_ID=at12f08pp6reqlxf05zpyhsdrzv7wwycq4gk6hjy4r9rxlvq0c9gu8s47rjdc
VITE_ALEO_BASE_FEE=500000
```

### Testing with two users

1. Open `http://localhost:3006` in **Browser A** (Chrome profile 1)
2. Open `http://localhost:3006` in **Browser B** (Chrome profile 2 or incognito)
3. Both connect their wallets
4. **A**: Create Meeting → copy the link or QR code
5. **B**: Open the link (or enter the meeting code)
6. Both select availability and submit
7. **A**: Click "Find Common Time" — wallet popup appears, approve the transaction
8. Both see the result with a link to the on-chain ZK proof

---

## Deployment

### Frontend → Vercel

- Set **Root Directory** to `aleocal/`
- Framework: **Vite** (auto-detected)
- Add environment variables in Vercel dashboard (all `VITE_*` keys above, with `VITE_SIGNALING_URL` pointing to your Render/Railway server)

`vercel.json` (already included) sets the required COOP/COEP headers for SharedArrayBuffer:

```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
      { "key": "Cross-Origin-Opener-Policy",   "value": "same-origin"  }
    ]
  }]
}
```

### Signaling server → Render / Railway

```bash
# Root directory: zk-server
# Build: npm install
# Start: node server.js
```

Set these environment variables on the host:

```env
NODE_ENV=production
CORS_ORIGIN=https://your-app.vercel.app
```

The server binds to `process.env.PORT` automatically (Render and Railway inject this).

---

## Privacy Model

| Data | Visible to counterparty | Visible on-chain |
|------|------------------------|-----------------|
| Individual slot preferences | Never | Never |
| Full calendar | Never | Never |
| Meeting participation | Yes (you know who you scheduled with) | No |
| Best meeting slot | Yes | Yes (public mapping) |
| ZK proof validity | Yes | Yes |
| Wallet address | Yes | Yes (TX submitter) |

The ZK circuit enforces: if either party rates a slot 0 (unavailable), the product for that slot is 0, so it can never win. Only slots where **both** parties are available can appear as the result.

---

## Socket.io Event Reference

| Event | Direction | Payload |
|-------|-----------|---------|
| `create_meeting` | Client → Server | `{ meetingId, hostAddress }` |
| `meeting_created` | Server → Host | — |
| `join_meeting` | Client → Server | `{ meetingId, joinerAddress }` |
| `meeting_joined` | Server → Joiner | `{ hostAddress }` |
| `joiner_connected` | Server → Host | `{ joinerAddress }` |
| `submit_slots` | Joiner → Server | `{ meetingId, slots: number[], joinerAddress }` |
| `joiner_ready` | Server → Host | `{ meetingId, joinerAddress, slots }` |
| `broadcast_result` | Host → Server | `{ meetingId, result: MeetingResult }` |
| `meeting_result` | Server → Both | `{ meetingId, result }` |
| `peer_disconnected` | Server → Peer | `{ role: 'host' \| 'guest' }` |

---

## License

MIT — see [LICENSE](LICENSE).

---

*AleoCal — schedule privately, prove it publicly.*
