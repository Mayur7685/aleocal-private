// Final component for Aleo AleoCal
// Display final result and create calendar event
import React from "react";
import {
  VStack,
  Button,
  Heading,
  Link,
  Text,
  Box,
  Badge,
} from "@chakra-ui/react";
import { ReactTyped } from "react-typed";
import {
  chakra,
  ImageProps,
  forwardRef,
  usePrefersReducedMotion,
} from "@chakra-ui/react"
import { keyframes } from "@emotion/react"
import { FaGoogle, FaRedo } from "react-icons/fa";

import { UserContext, UserContextType } from "../App";
import logo from "./loading.png"

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

export const Logo = forwardRef<ImageProps, "img">((props, ref) => {
  const prefersReducedMotion = usePrefersReducedMotion()

  const animation = prefersReducedMotion
    ? undefined
    : `${spin} infinite 20s linear`

  return <chakra.img animation={animation} src={logo} ref={ref} {...props} />
})

const timeslots = [
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM"
];

export const Finalize: React.FC = () => {
  const context = React.useContext(UserContext) as UserContextType;
  const { result, aleoAccount } = context;

  // Generate Google Calendar link
  const generateCalendarLink = (): string => {
    if (!result || !result.valid) return "#";

    const resultInt = result.best_slot;
    const startTime = (9 + resultInt).toString().padStart(2, "0");
    const endTime = (10 + resultInt).toString().padStart(2, "0");

    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateString = `${tomorrow.getFullYear()}${(tomorrow.getMonth() + 1).toString().padStart(2, "0")}${tomorrow.getDate().toString().padStart(2, "0")}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Private+Meeting&dates=${dateString}T${startTime}0000/${dateString}T${endTime}0000&details=Meeting+scheduled+via+AleoCal+(Aleo+ZK)`;
  };

  const hasResult = result !== null;
  const isValidResult = hasResult && result.valid;

  return (
    <VStack paddingY={0} justify="space-around" alignItems="left">
      <VStack minH="100vh" minW="100vw" justify="space-evenly" bg="aleocal.ivory">
        {/* Loading state */}
        {!hasResult && (
          <>
            <Heading color="aleocal.coal">
              Computing
              <ReactTyped strings={[".", "..", "..."]} typeSpeed={80} showCursor={false} loop />
            </Heading>
            <Logo boxSize="100px" filter="brightness(0.1)" />
            <Text color="aleocal.coal" opacity={0.6}>
              Generating zero-knowledge proof...
            </Text>
          </>
        )}

        {/* Valid result */}
        {isValidResult && (
          <>
            <VStack spacing={6}>
              <Badge bg="aleocal.lime" color="aleocal.coal" fontSize="lg" p={2} borderRadius="md">
                Meeting Time Found!
              </Badge>

              <Heading fontSize="4xl">
                {timeslots[result.best_slot]}
              </Heading>

              <Box p={4} borderRadius="md" bg="aleocal.cloudberry">
                <Text fontSize="sm" color="aleocal.coal">
                  Preference Score: {result.best_score}
                </Text>
              </Box>
            </VStack>

            <VStack spacing={4}>
              <Button
                borderRadius={20}
                bg="aleocal.pomelo"
                color="aleocal.coal"
                borderColor="aleocal.coal"
                leftIcon={<FaGoogle />}
                as={Link}
                href={generateCalendarLink()}
                target="_blank"
                _hover={{ bg: "aleocal.tangerine" }}
              >
                Create Google Calendar Event
              </Button>

              <Button
                borderRadius={20}
                variant="outline"
                borderColor="aleocal.coal"
                color="aleocal.coal"
                leftIcon={<FaRedo />}
                onClick={() => window.location.reload()}
                _hover={{ bg: "aleocal.stone" }}
              >
                Start Over
              </Button>
            </VStack>

            <Text fontSize="xs" color="aleocal.coal" opacity={0.6} maxW="400px" textAlign="center">
              Your calendar data remained private throughout this process.
              Only the common meeting time was revealed using zero-knowledge proofs.
            </Text>
          </>
        )}

        {/* No common time found */}
        {hasResult && !isValidResult && (
          <>
            <VStack spacing={6}>
              <Badge bg="aleocal.tangerine" color="aleocal.coal" fontSize="lg" p={2} borderRadius="md">
                No Common Time Available
              </Badge>

              <Heading fontSize="3xl">
                Unable to find a matching slot
              </Heading>

              <Text color="aleocal.coal" opacity={0.6} maxW="400px" textAlign="center">
                Neither party has overlapping availability during the selected day.
                Try selecting more time slots and running again.
              </Text>
            </VStack>

            <Button
              borderRadius={20}
              bg="aleocal.cloudberry"
              color="aleocal.coal"
              borderColor="aleocal.coal"
              leftIcon={<FaRedo />}
              onClick={() => window.location.reload()}
              _hover={{ bg: "aleocal.pomelo" }}
            >
              Try Again
            </Button>
          </>
        )}

        {/* Footer */}
        <Text fontSize="xs" color="aleocal.coal" opacity={0.6}>
          Powered by Aleo Zero-Knowledge Proofs
        </Text>
      </VStack>
    </VStack>
  );
}
