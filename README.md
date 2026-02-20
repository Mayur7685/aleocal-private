# AleoCal - Zero-Knowledge Calendar Scheduling

> Find the perfect meeting time without revealing your schedule

[![Aleo](https://img.shields.io/badge/Built%20on-Aleo-000000)](https://aleo.org)
[![Leo](https://img.shields.io/badge/Smart%20Contract-Leo-000000)](https://leo-lang.org)
[![License](https://img.shields.io/badge/License-MIT-000000.svg)](LICENSE)

---

## 1. Project Overview

### What is AleoCal?

AleoCal is a **zero-knowledge calendar scheduling application** built on the Aleo blockchain. It allows two parties to find common available meeting times without revealing their full calendar to each other.

### The Problem

Traditional calendar scheduling tools like Calendly, Doodle, or Google Calendar require users to:
- Share their entire availability publicly
- Trust third-party servers with sensitive schedule data
- Reveal work patterns, busy times, and availability to strangers

**This is a privacy nightmare.** Your calendar reveals:
- When you're in meetings (busy/important)
- When you're free (potentially vulnerable)
- Work patterns and habits
- Personal appointments and commitments

### Our Solution

AleoCal uses **Zero-Knowledge Proofs (ZKPs)** to compute calendar intersections privately:

```
Host Calendar:    [2, 0, 3, 0, 1, 0, 4, 0]  (preference scores 0-4)
Guest Calendar:   [1, 0, 2, 0, 3, 0, 2, 0]  (preference scores 0-4)
                          ↓
              ZK Computation (multiplication)
                          ↓
Intersection:     [2, 0, 6, 0, 3, 0, 8, 0]  (combined scores)
                          ↓
Result:           Best slot = 6 (4pm-5pm with score 8)
```

**Only the best meeting time is revealed** - not the underlying calendars!

### Why Privacy Matters

| Traditional Tools | AleoCal |
|------------------|----------|
| Full calendar visible to organizer | Only intersection revealed |
| Server stores all availability data | No central server sees calendars |
| Third parties can analyze patterns | Cryptographic privacy guarantees |
| Trust required in service provider | Trustless ZK verification |

### Product Market Fit (PMF)

**Target Users:**
1. **Enterprise Teams** - Sensitive internal meetings, M&A discussions
2. **Healthcare** - Doctor-patient scheduling without revealing other appointments
3. **Legal** - Attorney-client meetings with confidentiality requirements
4. **Executive Assistants** - Scheduling for C-level executives
5. **Privacy-Conscious Individuals** - Anyone who values schedule privacy

**Market Size:**
- Calendar scheduling market: $500M+ annually
- Enterprise privacy software: $15B+ market
- Growing regulatory pressure (GDPR, CCPA) driving privacy adoption

### Go-To-Market (GTM) Strategy

**Phase 1: Developer Community (Current)**
- Open-source on GitHub
- Aleo hackathon participation
- Developer documentation and tutorials

**Phase 2: Early Adopters**
- Privacy-focused tech companies
- Crypto-native organizations
- Healthcare pilot programs

**Phase 3: Enterprise**
- SOC2 compliance certification
- Enterprise integrations (Outlook, Google Calendar)
- White-label solutions

**Phase 4: Consumer**
- Browser extensions
- Mobile apps
- Integration with existing calendar apps

---

## 2. Working Demo

### Live Demo

**Frontend:** http://localhost:3006 (development)

**ZK Server:** http://localhost:3030

### Demo Flow

#### Step 1: Connect Wallet
- Install [Leo Wallet](https://leo.app) browser extension
- Connect to Aleo Testnet Beta
- Wallet popup will request connection approval

#### Step 2: Create or Join Event
**Host:**
1. Click "Create Event"
2. Copy the generated Event Code

**Guest:**
1. Paste the Event Code
2. Click "Join Event"

#### Step 3: Select Availability
- Click on time slots to set preference (1-4 scale)
- Higher number = more preferred
- X = unavailable (0)

#### Step 4: View Results
- Both parties see the best meeting time
- Only the optimal slot is revealed
- Full calendars remain private

### Smart Contract Deployment

The Leo smart contract is designed for Aleo Testnet:

```leo
program aleocal.aleo {
    // Calendar record - encrypted on-chain
    record Calendar {
        owner: address,
        day: DaySlots,
        calendar_id: field,
    }

    // Meeting result - only reveals best slot
    record MeetingResult {
        owner: address,
        meeting_id: field,
        best_slot: u8,
        best_score: u8,
        valid: bool,
    }

    // Create encrypted calendar
    transition create_calendar(...) -> Calendar

    // Compute intersection privately
    transition compute_intersection_direct(...) -> (Calendar, MeetingResult)
}
```

---

## 3. Technical Documentation

### Repository Structure

```
aleo-aleocal/
├── aleocal/                    # Frontend React application
│   ├── src/
│   │   ├── aleo/               # Aleo SDK integration
│   │   │   ├── aleoConfig.ts   # Network configuration
│   │   │   ├── testnetClient.ts # SDK wrapper
│   │   │   ├── createCalendar.ts # Calendar creation logic
│   │   │   ├── computeIntersection.ts # ZK intersection
│   │   │   └── mockAleoSDK.ts  # Development mock
│   │   ├── components/         # React components
│   │   │   ├── ConnectWallet.tsx
│   │   │   ├── AddParticipants.tsx
│   │   │   ├── Calender.tsx
│   │   │   └── Results.tsx
│   │   ├── signalling/         # WebSocket signaling
│   │   └── App.tsx             # Main application
│   ├── package.json
│   └── vite.config.ts          # Vite + WASM configuration
│
├── zk-server/                   # ZK Signaling Server
│   ├── server.js               # Express + Socket.io
│   └── package.json
│
├── aleo/                        # Leo Smart Contracts
│   └── aleocal/
│       ├── src/
│       │   └── main.leo        # Main contract
│       ├── program.json
│       └── README.md
│
└── README.md                    # This file
```

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Host Browser  │     │  Guest Browser  │
│  (Leo Wallet)   │     │  (Leo Wallet)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    WebSocket/HTTP     │
         └───────────┬───────────┘
                     │
              ┌──────┴──────┐
              │  ZK Server  │
              │  (Socket.io)│
              └──────┬──────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────┴────┐           ┌─────┴─────┐
    │  Aleo   │           │   Aleo    │
    │  WASM   │           │  Testnet  │
    │  Local  │           │  (future) │
    └─────────┘           └───────────┘
```

### Data Flow

```
1. Host creates event
   └─> Generates unique event code (address:field)
   └─> Registers with ZK Server via WebSocket

2. Guest joins event
   └─> Connects to ZK Server with event code
   └─> Server links host and guest sockets

3. Both parties submit calendars
   └─> Local ZK proof generation (or simulation)
   └─> Calendar slots sent via encrypted channel

4. Host computes intersection
   └─> Multiplication of preference values
   └─> argmax to find best slot
   └─> Result sent to both parties

5. Result displayed
   └─> Only best time slot revealed
   └─> Full calendars remain private
```

### Privacy Model

#### What is Private?

| Data | Private? | Notes |
|------|----------|-------|
| Individual time slot preferences | ✅ Yes | Never revealed |
| Full calendar availability | ✅ Yes | Never shared |
| Aleo wallet address | ⚠️ Pseudonymous | On-chain identity |
| Best meeting time | ❌ No | Intentionally revealed |
| Event participation | ⚠️ Partial | Parties know each other |

#### Cryptographic Guarantees

1. **Zero-Knowledge Proofs**: Calendar intersection computed without revealing inputs
2. **Record Encryption**: Aleo records are encrypted to owner's view key
3. **Local Execution**: ZK proofs generated client-side (no server sees data)

#### Privacy-Preserving Intersection Algorithm

```
Input:  A = [a₀, a₁, ..., a₇]  (Host preferences, 0-4)
        B = [b₀, b₁, ..., b₇]  (Guest preferences, 0-4)

Compute: C[i] = A[i] × B[i]    (Element-wise multiplication)

Output:  best_slot = argmax(C)  (Index of maximum value)
         best_score = max(C)    (Maximum value)
         valid = (best_score > 0)
```

**Why multiplication?**
- If either party is unavailable (0), product is 0
- Higher preferences on both sides = higher score
- Only the final result (best slot) is revealed

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Blockchain | Aleo | Privacy-preserving smart contracts |
| Smart Contract | Leo | ZK program language |
| Frontend | React + TypeScript | User interface |
| Bundler | Vite | Fast development, WASM support |
| Wallet | Leo Wallet | Aleo account management |
| SDK | @provablehq/sdk | ZK proof generation |
| Signaling | Socket.io | Real-time calendar exchange |
| Styling | Chakra UI | Component library |

### Local Development

#### Prerequisites

- Node.js 18+
- Leo Wallet browser extension
- Aleo account (Testnet Beta)

#### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/aleo-aleocal.git
cd aleo-aleocal

# Install frontend dependencies
cd aleocal
npm install

# Install ZK server dependencies
cd ../zk-server
npm install
```

#### Running the Application

**Terminal 1 - ZK Server:**
```bash
cd zk-server
npm start
# Server runs on http://localhost:3030
```

**Terminal 2 - Frontend:**
```bash
cd aleocal
npm run dev
# App runs on http://localhost:3006
```

#### Testing with Two Users

1. Open http://localhost:3006 in Chrome Profile 1
2. Open http://localhost:3006 in Chrome Profile 2
3. Both connect Leo Wallet with different accounts
4. Profile 1: Create Event → Copy code
5. Profile 2: Paste code → Join Event
6. Both: Select availability → Submit
7. Profile 1: Click "Find Common Time"
8. Both see the result!

### API Reference

#### ZK Server Endpoints

**Health Check**
```
GET /health
Response: { "status": "ok", "message": "AleoCal ZK Server running", "peers": 0 }
```

**Compute Intersection (REST)**
```
POST /api/calendar/intersect
Body: { "calendar1": [0,1,2,0,0,3,0,1], "calendar2": [1,0,2,0,3,0,1,0] }
Response: { "success": true, "bestSlot": 2, "bestScore": 4, "valid": true }
```

#### WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `ready` | Client→Server | `peerId` | Register peer connection |
| `messageOne` | Client→Server | `{from, target, message}` | Send to specific peer |
| `message` | Server→Client | `{from, target, message}` | Receive forwarded message |

### Security Considerations

1. **No Server Storage**: ZK server only forwards messages, never stores calendars
2. **Client-Side Proofs**: ZK proofs generated in browser WASM
3. **Wallet Authentication**: Leo Wallet provides cryptographic identity
4. **Event Codes**: Cryptographically random, hard to guess

### Future Roadmap

- [ ] Deploy to Aleo Mainnet
- [ ] Multi-party scheduling (3+ people)
- [ ] Recurring meeting support
- [ ] Calendar import (iCal, Google Calendar)
- [ ] Mobile app (React Native)
- [ ] Enterprise SSO integration
- [ ] Audit by security firm

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for [Aleo Privacy Buildathon](https://aleo.org)
- Powered by [Leo Language](https://leo-lang.org)
- UI components from [Chakra UI](https://chakra-ui.com)

---

**AleoCal** - *Zero-knowledge scheduling for the privacy era.*
