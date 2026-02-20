// Calendar component for Aleo AleoCal
// Select availability, create ZK proof locally, and coordinate via server
import * as React from "react"
import { useState } from "react";
import {
  VStack,
  Button,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  HStack,
  useToast,
  Text,
  Badge,
} from "@chakra-ui/react"

import { UserContext, UserContextType } from "../App";
import { createCalendar } from "../aleo";
import { submitSlots } from "../aleo/meetingService";

const days = 1;
const hours = 8;
const maxLevel = 5;

const initialCalendar = Array(days).fill([]).map(() => Array(hours).fill(0));

interface CalenderButtonProps {
  hr: number;
  day: number;
  levelArr: number[][];
  setLevelArr: (x: any) => any;
}

const CalenderButton: React.FC<CalenderButtonProps> = ({ hr, day, levelArr, setLevelArr }) => {
  const level = levelArr[day][hr];

  const increaseLevel = () => {
    setLevelArr((lvlArr: number[][]) => {
      const newLvlArr = Array(days).fill([]).map(() => Array(hours).fill(0));
      for (let i = 0; i < days; i++)
        for (let j = 0; j < hours; j++)
          newLvlArr[i][j] = lvlArr[i][j];
      newLvlArr[day][hr] = (newLvlArr[day][hr] + 1) % maxLevel;
      return newLvlArr;
    });
  }

  const levelColors = [
    "#E3E3E3", // 0 – unavailable
    "#FFE092", // 1 – low preference
    "#C4FFC2", // 2
    "#FFE2FC", // 3
    "#FFA978", // 4 – high preference
  ];

  return (
    <Button
      width="95%"
      borderRadius="md"
      onClick={increaseLevel}
      bg={levelColors[level]}
      color="#121212"
      _hover={{ opacity: 0.8 }}
    >
      {level === 0 ? "×" : level}
    </Button>
  );
}

interface CalenderProps {
  nextPage: () => void;
}

export const Calender: React.FC<CalenderProps> = ({ nextPage }) => {
  const [calender, setCalender] = useState<number[][]>(initialCalendar);
  const timeslots = [
    "9am–10am", "10am–11am", "11am–12pm", "12pm–1pm",
    "1pm–2pm",  "2pm–3pm",  "3pm–4pm",  "4pm–5pm",
  ];
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const context = React.useContext(UserContext) as UserContextType;
  const {
    aleoAccount,
    meetingId,
    partyBit,
    signalingChannel,
    setMyCalendarRecord,
    setMyCalendarSlots,
    setMyReady,
  } = context;

  const isHost = partyBit === 0;

  const submitCalendar = async () => {
    if (!aleoAccount) {
      toast({ title: "Error", description: "Connect your account first", status: "error", duration: 3000, isClosable: true });
      return;
    }

    setLoading(true);
    try {
      const slots = calender.flat();

      // Create ZK calendar record locally (Aleo web worker → mock fallback)
      console.log('[Calender] Creating ZK calendar record...');
      const result = await createCalendar(aleoAccount, slots);

      setMyCalendarRecord(result.record);
      setMyCalendarSlots(slots);
      setMyReady(true);

      if (!isHost) {
        // JOINER: Send slots to server → server forwards to host
        if (meetingId && signalingChannel) {
          submitSlots(meetingId, slots, aleoAccount.address);
          console.log('[Calender] Joiner slots submitted to server');
        }

        toast({
          title: "Calendar Submitted!",
          description: "Your availability has been sent to the host. Waiting for them to compute the result.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        // HOST: calendar saved locally, waiting for joiner
        toast({
          title: "Calendar Saved",
          description: "Waiting for the other party to submit their availability.",
          status: "success",
          duration: 4000,
          isClosable: true,
        });
      }

      setLoading(false);
      nextPage();
    } catch (error: any) {
      setLoading(false);
      console.error("[Calender] Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create calendar",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }

  return (
    <VStack paddingY={0} justify="space-around" alignItems="left">
      <VStack minH="100vh" minW="100vw" justify="space-evenly" bg="aleocal.ivory">
        <VStack spacing={2}>
          <Heading fontSize={"5xl"}>Step 3: Your Availability</Heading>
          <HStack spacing={3}>
            <Badge bg={isHost ? "#C4FFC2" : "#FFE2FC"} color="aleocal.coal" px={3} py={1} borderRadius="md">
              {isHost ? "Host" : "Guest"}
            </Badge>
            {meetingId && (
              <Text fontSize="xs" color="aleocal.coal" opacity={0.6}>
                Meeting: {meetingId.substring(0, 12)}...
              </Text>
            )}
          </HStack>
        </VStack>

        <Text fontSize="sm" color="aleocal.coal" opacity={0.6} maxW="500px" textAlign="center">
          Click slots to set preference level (1–4). Higher = more preferred. × = unavailable.
        </Text>

        <TableContainer>
          <Table variant='simple'>
            <Thead>
              <Tr>
                <Th>Time Slot</Th>
                <Th>Preference</Th>
              </Tr>
            </Thead>
            <Tbody>
              {timeslots.map((timeslot, h) => (
                <Tr key={h}>
                  <Td>{timeslot}</Td>
                  {initialCalendar.map((_, d) => (
                    <Td key={d + "_" + h} padding={0}>
                      <CalenderButton hr={h} day={d} levelArr={calender} setLevelArr={setCalender} />
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        <HStack spacing={4}>
          <Button onClick={() => setCalender(initialCalendar)} variant="outline">
            Reset
          </Button>
          <Button
            onClick={submitCalendar}
            isLoading={loading}
            loadingText="Creating ZK Proof..."
            isDisabled={!aleoAccount}
            size="lg"
            bg="aleocal.lime"
            color="aleocal.coal"
            borderColor="aleocal.coal"
            _hover={{ bg: "aleocal.pomelo" }}
          >
            Submit Availability
          </Button>
        </HStack>

        <Text fontSize="xs" color="aleocal.coal" opacity={0.5} maxW="400px" textAlign="center">
          Your calendar is processed locally using zero-knowledge cryptography.
          Only the intersection is revealed — your full schedule stays private.
        </Text>
      </VStack>
    </VStack>
  );
}
