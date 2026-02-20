// AddParticipants component for Aleo AleoCal
// Host creates meeting (QR + link), joiner opens link or enters code
import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
  VStack,
  Button,
  Heading,
  Text,
  Input,
  HStack,
  useToast,
  InputGroup,
  InputRightElement,
  Box,
  Badge,
  Divider,
} from "@chakra-ui/react";
import { QRCodeSVG } from "qrcode.react";

import { UserContext, UserContextType } from "../App";
import { generateRandomField } from "../aleo";
import {
  connectToServer,
  createMeeting,
  joinMeeting,
  onJoinerConnected,
  onJoinerReady,
  onMeetingResult,
} from "../aleo/meetingService";

interface AddParticipantsProps {
  nextPage: () => void;
}

export const AddParticipants: React.FC<AddParticipantsProps> = ({ nextPage }) => {
  const context = React.useContext(UserContext) as UserContextType;
  const {
    aleoAccount,
    meetingId,
    setMeetingId,
    setPartyBit,
    setOtherPartyAddress,
    setOtherCalendarSlots,
    setOtherReady,
    setSignalingChannel,
    setResult,
    serverUrl,
    autoJoin,
    partyBit,
    otherPartyAddress,
  } = context;

  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState<string>("");
  const [joinerConnected, setJoinerConnected] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState<string>("");
  const toast = useToast();

  // If app was opened via meeting link, auto-join immediately
  useEffect(() => {
    if (autoJoin && meetingId && otherPartyAddress && aleoAccount && partyBit === 1) {
      handleAutoJoin();
    }
  }, [autoJoin, meetingId, otherPartyAddress, aleoAccount]);

  const handleAutoJoin = async () => {
    if (!aleoAccount || !meetingId || !otherPartyAddress) return;
    setLoading(true);
    try {
      const socket = connectToServer(serverUrl);
      setSignalingChannel(socket);

      // Listen for meeting result (joiner needs to know when host computes)
      onMeetingResult((data) => {
        setResult(data.result);
      });

      await joinMeeting(meetingId, aleoAccount.address);
      // otherPartyAddress already set from URL params

      toast({
        title: "Joined Meeting!",
        description: "Now select your availability below.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setLoading(false);
      nextPage();
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Could not join",
        description: err.message || "The meeting link may have expired.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // HOST: Create a new meeting
  const createEvent = async () => {
    if (!aleoAccount) {
      toast({ title: "Error", description: "Connect your account first", status: "error", duration: 3000, isClosable: true });
      return;
    }

    setLoading(true);
    try {
      // Generate a random field value (pure number, no "field" suffix)
      const fieldValue = await generateRandomField();
      const fieldNumber = fieldValue.replace('field', '');

      // Connect socket
      const socket = connectToServer(serverUrl);
      setSignalingChannel(socket);

      // Register meeting on server
      await createMeeting(fieldNumber, aleoAccount.address);

      setMeetingId(fieldNumber);
      setPartyBit(0); // host

      // Build shareable URL
      const origin = window.location.origin;
      const url = `${origin}/?m=${fieldNumber}&h=${aleoAccount.address}`;
      setMeetingUrl(url);

      // Listen for joiner connecting
      const offConnected = onJoinerConnected(({ joinerAddress }) => {
        setOtherPartyAddress(joinerAddress);
        setJoinerConnected(true);
        toast({
          title: "Joiner Connected!",
          description: `${joinerAddress.substring(0, 14)}... joined the meeting`,
          status: "success",
          duration: 4000,
          isClosable: true,
        });
      });

      // Listen for joiner's slots
      onJoinerReady(({ joinerAddress, slots }) => {
        setOtherPartyAddress(joinerAddress);
        setOtherCalendarSlots(slots);
        setOtherReady(true);
        offConnected();
      });

      toast({
        title: "Meeting Created!",
        description: "Share the QR code or link with the other person",
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create meeting",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // JOINER: Join via entered code
  const joinEvent = async () => {
    if (!aleoAccount) {
      toast({ title: "Error", description: "Connect your account first", status: "error", duration: 3000, isClosable: true });
      return;
    }

    const code = joinCode.trim();
    if (!code) {
      toast({ title: "Error", description: "Enter a meeting code", status: "error", duration: 3000, isClosable: true });
      return;
    }

    setLoading(true);
    try {
      const socket = connectToServer(serverUrl);
      setSignalingChannel(socket);

      // Listen for meeting result
      onMeetingResult((data) => {
        setResult(data.result);
      });

      const { hostAddress } = await joinMeeting(code, aleoAccount.address);

      setMeetingId(code);
      setPartyBit(1); // joiner
      setOtherPartyAddress(hostAddress);

      toast({
        title: "Joined!",
        description: "Now select your availability.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setLoading(false);
      nextPage();
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Failed to join",
        description: error.message || "Meeting not found. Ask host to create a new one.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // HOST: proceed to calendar selection
  const proceedAsHost = () => {
    if (meetingId) nextPage();
  };

  return (
    <VStack paddingY={0} justify="space-around" alignItems="left">
      <VStack minH="100vh" justify="space-evenly" minW="100vw" bg="aleocal.ivory">
        <Heading fontSize={"5xl"}>Step 2: Create or Join Meeting</Heading>

        {/* HOST VIEW: after creating meeting */}
        {meetingId && meetingUrl && (
          <VStack spacing={5} maxW="600px" w="100%">
            <Box
              p={5}
              borderRadius="lg"
              borderWidth={2}
              borderColor={joinerConnected ? "aleocal.lime" : "aleocal.stone"}
              bg={joinerConnected ? "aleocal.lime" : "white"}
              w="100%"
            >
              <VStack spacing={4}>
                <HStack>
                  <Text fontWeight="bold" color="aleocal.coal">Meeting Status:</Text>
                  <Badge
                    bg={joinerConnected ? "#C4FFC2" : "#FFE092"}
                    color="aleocal.coal"
                    px={3} py={1} borderRadius="md"
                  >
                    {joinerConnected ? "Joiner Connected ✓" : "Waiting for joiner..."}
                  </Badge>
                </HStack>

                {/* QR Code */}
                <Box p={3} bg="white" borderRadius="md" borderWidth={1} borderColor="aleocal.stone">
                  <QRCodeSVG value={meetingUrl} size={180} />
                </Box>

                <Text fontSize="sm" color="aleocal.coal" opacity={0.7} textAlign="center">
                  Scan QR code or share the link below
                </Text>

                <InputGroup size='sm' w="100%">
                  <Input value={meetingUrl} readOnly fontSize="xs" bg="white" />
                  <InputRightElement width='4.5rem'>
                    <Button
                      size='xs'
                      h='1.5rem'
                      onClick={() => {
                        navigator.clipboard.writeText(meetingUrl);
                        toast({ title: "Link copied!", status: "success", duration: 2000 });
                      }}
                    >
                      Copy
                    </Button>
                  </InputRightElement>
                </InputGroup>

                <Text fontSize="xs" color="aleocal.coal" opacity={0.6}>
                  Meeting code: <strong>{meetingId}</strong>
                </Text>
              </VStack>
            </Box>

            <Button
              onClick={proceedAsHost}
              size="lg"
              bg="aleocal.pomelo"
              color="aleocal.coal"
              borderColor="aleocal.coal"
              _hover={{ bg: "aleocal.lime" }}
            >
              Continue to Select Availability →
            </Button>
          </VStack>
        )}

        {/* Initial Create/Join UI */}
        {!meetingId && (
          <HStack spacing="5vw" justify="space-between" alignItems="flex-start">
            {/* Create Meeting */}
            <VStack alignItems="left" spacing="3vh" maxW="350px">
              <Heading fontSize="2xl" color="aleocal.coal">Create Meeting</Heading>
              <Text color="aleocal.coal" fontSize="sm">
                Start a new meeting. A QR code and link will be generated for the other person to join.
              </Text>
              <Button
                onClick={createEvent}
                isLoading={loading}
                loadingText="Creating..."
                size="lg"
              >
                Create Meeting
              </Button>
            </VStack>

            <VStack borderLeft="1px" borderColor="aleocal.stone" height="40vh" />

            {/* Join Meeting */}
            <VStack alignItems="left" spacing="3vh" maxW="350px">
              <Heading fontSize="2xl" color="aleocal.coal">Join Meeting</Heading>
              <Text color="aleocal.coal" fontSize="sm">
                Enter the meeting code shared by the host, or open the link they sent you.
              </Text>
              <Input
                placeholder="Enter meeting code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                fontSize="sm"
              />
              <Button
                isDisabled={!joinCode.trim()}
                onClick={joinEvent}
                isLoading={loading}
                loadingText="Joining..."
                size="lg"
              >
                Join Meeting
              </Button>
            </VStack>
          </HStack>
        )}

        {aleoAccount && (
          <Text fontSize="xs" color="aleocal.coal" opacity={0.5}>
            Your address: {aleoAccount.address}
          </Text>
        )}
      </VStack>
    </VStack>
  );
};
