// Results component for Aleo AleoCal
// HOST: runs find_common_time on calmatchtwo.aleo (real on-chain ZK proof when wallet connected)
// JOINER: waits for host's result via socket
import * as React from "react";
import {
  Text,
  VStack,
  Button,
  Heading,
  HStack,
  useToast,
  Box,
  Badge,
  Spinner,
  Link,
} from "@chakra-ui/react";
import { ReactTyped } from "react-typed";
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

import { UserContext, UserContextType } from "../App";
import { computeIntersectionDirect } from "../aleo";
import {
  onJoinerReady,
  onMeetingResult,
  broadcastResult,
  onPeerDisconnected,
} from "../aleo/meetingService";
import {
  buildFindCommonTimeOptions,
  pollMeetingResult,
} from "../aleo/walletService";
import { MeetingResult } from "../aleo/types";

interface ResultsProps {
  nextPage: () => void;
}

const TIMESLOTS = [
  "9am–10am", "10am–11am", "11am–12pm", "12pm–1pm",
  "1pm–2pm",  "2pm–3pm",  "3pm–4pm",  "4pm–5pm",
];

function extractSlotsFromRecord(record: string): number[] {
  const slots: number[] = [];
  for (let i = 0; i < 8; i++) {
    const m = record.match(new RegExp(`s${i}:\\s*(\\d+)u8`))
            || record.match(new RegExp(`slot_${i}:\\s*(\\d+)u8`));
    slots.push(m ? parseInt(m[1]) : 0);
  }
  return slots;
}

export const Results: React.FC<ResultsProps> = ({ nextPage }) => {
  const context = React.useContext(UserContext) as UserContextType;
  const {
    aleoAccount,
    meetingId,
    myCalendarRecord,
    myCalendarSlots,
    partyBit,
    otherCalendarSlots,
    otherReady,
    setOtherPartyAddress,
    setOtherCalendarSlots,
    setOtherReady,
    result,
    setResult,
    signalingChannel,
  } = context;

  const { connected, executeTransaction, transactionStatus } = useWallet();
  const [loading, setLoading]         = React.useState(false);
  const [loadingText, setLoadingText] = React.useState("");
  const [proofTxId, setProofTxId]     = React.useState<string | null>(null);
  const [peerDisconnected, setPeerDisconnected] = React.useState(false);
  const toast = useToast();
  const isHost = partyBit === 0;
  const listenersAttached = React.useRef(false);

  React.useEffect(() => {
    if (listenersAttached.current || !signalingChannel) return;
    listenersAttached.current = true;

    if (isHost) {
      const offReady = onJoinerReady(({ joinerAddress, slots }) => {
        setOtherPartyAddress(joinerAddress);
        setOtherCalendarSlots(slots);
        setOtherReady(true);
        toast({
          title: "Guest is ready!",
          description: "Click 'Find Common Time' to generate the ZK proof.",
          status: "info", duration: 5000, isClosable: true,
        });
      });
      return () => { offReady(); };
    } else {
      const offResult = onMeetingResult(({ result: r }) => {
        setResult(r);
        toast({
          title: r.valid ? "Meeting time found!" : "No common time",
          description: r.valid ? `Best slot: ${TIMESLOTS[r.best_slot]}` : "Try different availability.",
          status: r.valid ? "success" : "warning", duration: 6000, isClosable: true,
        });
        setTimeout(() => nextPage(), 2500);
      });
      const offDisc = onPeerDisconnected(({ role }) => {
        if (role === "host") setPeerDisconnected(true);
      });
      return () => { offResult(); offDisc(); };
    }
  }, [signalingChannel, isHost]);

  // ── LOCAL FALLBACK ──────────────────────────────────────────────────────────
  const runLocal = async (meetingIdField: string, calRecord: string, otherSlots: number[]) => {
    setLoadingText("Running local ZK computation…");
    const cr = await computeIntersectionDirect(aleoAccount!, calRecord, otherSlots, meetingIdField);
    setResult(cr);
    if (signalingChannel && meetingId) broadcastResult(meetingId, cr);
    toast({
      title: cr.valid ? "Common time found!" : "No overlap",
      description: cr.valid ? `Best slot: ${TIMESLOTS[cr.best_slot]}` : "No common slot found.",
      status: cr.valid ? "success" : "warning", duration: 5000, isClosable: true,
    });
    setLoading(false);
    nextPage();
  };

  // ── MAIN COMPUTE ────────────────────────────────────────────────────────────
  const computeIntersection = async () => {
    if (!aleoAccount || !meetingId) {
      toast({ title: "Error", description: "Missing account or meeting ID.", status: "error", duration: 3000 });
      return;
    }
    if (!otherCalendarSlots || otherCalendarSlots.length !== 8) {
      toast({ title: "Guest not ready", description: "Waiting for guest availability.", status: "warning", duration: 3000 });
      return;
    }
    const hostSlots = myCalendarSlots
      || (myCalendarRecord ? extractSlotsFromRecord(myCalendarRecord) : null);
    if (!hostSlots) {
      toast({ title: "Error", description: "Your availability data is missing. Go back.", status: "error", duration: 3000 });
      return;
    }

    const meetingIdField = `${meetingId}field`;
    setLoading(true);

    // ── ON-CHAIN path via wallet ─────────────────────────────────────────────
    if (connected && executeTransaction) {
      try {
        setLoadingText("Generating ZK proof (Groth16)…");
        const options = buildFindCommonTimeOptions(meetingIdField, hostSlots, otherCalendarSlots);

        setLoadingText("Confirm in wallet…");
        const txRes = await executeTransaction(options);
        const tempTxId = txRes?.transactionId ?? "";
        if (!tempTxId) throw new Error("Wallet did not return a transaction ID");

        toast({
          title: "Transaction submitted!",
          description: "Waiting for Aleo testnet to confirm (1–2 min)…",
          status: "info", duration: 12000, isClosable: true,
        });

        // Poll the on-chain mapping — it has a value only after the TX is finalized.
        // This is the ground truth: no transactionStatus loop needed.
        setLoadingText("Waiting for Aleo confirmation (1–2 min)…");
        const onChain = await pollMeetingResult(meetingIdField, 300_000);

        // TX confirmed — try once to get the real AT1... hash for the explorer link
        let realTxId = tempTxId;
        try {
          const statusResp = await transactionStatus(tempTxId);
          console.log("[Results] transactionStatus:", statusResp);
          if (statusResp.transactionId) realTxId = statusResp.transactionId;
        } catch (e) {
          console.warn("[Results] transactionStatus unavailable:", e);
        }
        setProofTxId(realTxId);

        const cr: MeetingResult = {
          owner: aleoAccount.address,
          meeting_id: meetingIdField,
          best_slot: onChain.best_slot,
          best_score: onChain.best_score,
          valid: onChain.valid,
          zkMode: "real",
          proof: realTxId,
        };
        setResult(cr);
        if (signalingChannel && meetingId) broadcastResult(meetingId, cr);

        toast({
          title: cr.valid ? "✓ Common time found!" : "No overlap",
          description: cr.valid
            ? `${TIMESLOTS[cr.best_slot]} — ZK proof recorded on Aleo testnet!`
            : "No common available slot.",
          status: cr.valid ? "success" : "warning", duration: 8000, isClosable: true,
        });
        setLoading(false);
        nextPage();

      } catch (err: any) {
        console.error("[Results] On-chain error:", err);
        toast({
          title: "On-chain error",
          description: err.message || "Check browser console for details.",
          status: "error", duration: 8000, isClosable: true,
        });
        setLoading(false);
        // Do NOT fall back to runLocal — local computation uses a different
        // algorithm (privycalendar.aleo) and gives incorrect results when
        // the wallet is connected. Show the error and let user retry.
      }

    } else {
      // ── LOCAL path ──────────────────────────────────────────────────────────
      if (!myCalendarRecord) {
        toast({ title: "Error", description: "Calendar record missing.", status: "error", duration: 3000 });
        setLoading(false);
        return;
      }
      try {
        await runLocal(meetingIdField, myCalendarRecord, otherCalendarSlots);
      } catch (err: any) {
        setLoading(false);
        toast({ title: "Computation failed", description: err.message, status: "error", duration: 5000 });
      }
    }
  };

  const readyColor   = "#C4FFC2";
  const pendingColor = "#FFE092";

  return (
    <VStack paddingY={0} justify="space-around" alignItems="left">
      <VStack minH="100vh" minW="100vw" justify="space-evenly" bg="aleocal.ivory">
        <VStack spacing={"4vh"} maxW="600px" w="100%">
          <Heading fontSize={"5xl"}>Step 4: Find Common Time</Heading>

          {/* ZK mode indicator */}
          <Badge
            bg={connected ? readyColor : pendingColor}
            color="aleocal.coal"
            px={3} py={1} borderRadius="md" fontSize="sm"
          >
            {connected ? "🔒 On-Chain ZK  (calmatchtwo.aleo)" : "⚡ Local ZK Mode"}
          </Badge>

          {/* Status badges */}
          <HStack spacing={4} justify="center">
            <Box p={3} borderRadius="md" borderWidth={1} borderColor="aleocal.stone" minW="140px" textAlign="center">
              <Text fontSize="sm" mb={1}>You ({isHost ? "Host" : "Guest"})</Text>
              <Badge bg={readyColor} color="aleocal.coal" px={2} py={1} borderRadius="md">Ready ✓</Badge>
            </Box>
            <Box p={3} borderRadius="md" borderWidth={1} borderColor="aleocal.stone" minW="140px" textAlign="center">
              <Text fontSize="sm" mb={1}>{isHost ? "Guest" : "Host"}</Text>
              <Badge bg={otherReady ? readyColor : pendingColor} color="aleocal.coal" px={2} py={1} borderRadius="md">
                {otherReady ? "Ready ✓" : "Waiting…"}
              </Badge>
            </Box>
          </HStack>

          {/* HOST view */}
          {isHost && !result && (
            <VStack spacing={4} w="100%">
              {!otherReady && (
                <HStack>
                  <Spinner size="sm" />
                  <Text color="aleocal.coal">
                    Waiting for guest to submit
                    <ReactTyped strings={[".", "..", "..."]} typeSpeed={80} showCursor={false} loop />
                  </Text>
                </HStack>
              )}
              {otherReady && !loading && (
                <Text color="aleocal.coal" fontWeight="medium" textAlign="center">
                  {connected
                    ? "Guest is ready — click below to generate the ZK proof and record it on-chain."
                    : "Guest is ready — click below to compute the common time locally."}
                </Text>
              )}
              {loading && (
                <HStack>
                  <Spinner size="sm" />
                  <Text color="aleocal.coal">{loadingText}</Text>
                </HStack>
              )}

              <Button
                onClick={computeIntersection}
                isLoading={loading}
                loadingText={loadingText || "Computing…"}
                isDisabled={!otherReady || (!myCalendarRecord && !myCalendarSlots)}
                size="lg"
                bg="aleocal.lime"
                color="aleocal.coal"
                borderColor="aleocal.coal"
                _hover={{ bg: "aleocal.cloudberry" }}
              >
                Find Common Time
              </Button>

              {connected && otherReady && (
                <Text fontSize="xs" color="aleocal.coal" opacity={0.5} textAlign="center">
                  Your wallet will generate a Groth16 ZK proof and submit it to Aleo testnet.
                  Your availability is never revealed — only the best slot is recorded.
                </Text>
              )}
            </VStack>
          )}

          {/* JOINER view */}
          {!isHost && !result && (
            <VStack spacing={3}>
              {peerDisconnected ? (
                <Text color="red.500">Host disconnected. Ask them to re-open the app.</Text>
              ) : (
                <>
                  <HStack>
                    <Spinner size="sm" />
                    <Text color="aleocal.coal">
                      Waiting for host to compute
                      <ReactTyped strings={[".", "..", "..."]} typeSpeed={80} showCursor={false} loop />
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="aleocal.coal" opacity={0.6} textAlign="center">
                    Your availability has been sent. The result will appear here automatically.
                  </Text>
                </>
              )}
            </VStack>
          )}

          {/* Result — shown on BOTH screens */}
          {result && (
            <Box
              p={6} borderRadius="xl" borderWidth={2}
              borderColor={result.valid ? "aleocal.lime" : "aleocal.stone"}
              bg={result.valid ? "aleocal.lime" : "aleocal.cloudberry"}
              w="100%" textAlign="center"
            >
              <VStack spacing={3}>
                <Text fontSize="xl" color="aleocal.coal" fontWeight="bold">
                  {result.valid ? "✓ Best Meeting Time Found!" : "No Common Availability"}
                </Text>

                {result.valid && (
                  <>
                    <Text fontSize="3xl" color="aleocal.coal">{TIMESLOTS[result.best_slot]}</Text>
                    <Text fontSize="sm" color="aleocal.coal" opacity={0.7}>
                      Combined preference score: {result.best_score} / 25
                    </Text>
                  </>
                )}

                {!result.valid && (
                  <Text color="aleocal.coal" opacity={0.7}>
                    No overlapping availability. Try selecting different time slots.
                  </Text>
                )}

                <HStack spacing={2} pt={1} justify="center" flexWrap="wrap">
                  <Badge
                    bg={result.zkMode === "real" ? readyColor : "#E2E8F0"}
                    color="aleocal.coal" fontSize="xs" px={2} py={1} borderRadius="md"
                  >
                    {result.zkMode === "real" ? "🔒 ZK Proof On-Chain" : "⚡ ZK Simulated"}
                  </Badge>
                </HStack>

                {result.zkMode === "real" && (result.proof || proofTxId) && (
                  <Link
                    href={`https://testnet.explorer.provable.com/transaction/${result.proof || proofTxId}`}
                    isExternal
                    fontSize="xs" color="aleocal.coal" textDecoration="underline" opacity={0.6}
                  >
                    View ZK proof on Aleo Explorer ↗
                  </Link>
                )}
              </VStack>
            </Box>
          )}

          <Text fontSize="xs" color="aleocal.coal" opacity={0.5} maxW="400px" textAlign="center">
            The ZK proof ensures the computation is honest — neither party's
            full calendar is revealed. Only the best slot is recorded on-chain.
          </Text>
        </VStack>
      </VStack>
    </VStack>
  );
};
