import {
  Text,
  VStack,
  Button,
  HStack,
  Heading,
  Box,
} from "@chakra-ui/react";
import { ReactTyped } from "react-typed";
import { useState } from "react";

interface HomePageProps {
  appName: string;
  nextPage: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({appName, nextPage}) => {
  // Color mapping for typed words
  const wordColors: Record<string, string> = {
    "meetings": "#FFE092",
    "standups": "#C4FFC2",
    "demos": "#FFE2FC",
    "reviews": "#FFA978",
    "interviews": "#FFE092",
    "syncs": "#C4FFC2",
  };

  const [currentColor, setCurrentColor] = useState("#FFE092");

  return <>
    <VStack paddingY={0} justify="space-around" alignItems="left">
      {/* Page 1 */}
      <VStack minH="100vh" minW="100vw" justify="space-evenly" bg="aleocal.ivory">
        <VStack alignItems="left" spacing={4}>
          <HStack flexWrap="wrap" justify="flex-start">
            <Heading fontSize={{base: "50px", md: "70px", lg: "80px"}} color="aleocal.coal">
              Schedule
            </Heading>
            <Box>
              <Heading fontSize={{base: "50px", md: "70px", lg: "80px"}} color={currentColor} display="inline">
                <ReactTyped
                  strings={Object.keys(wordColors)}
                  typeSpeed={80}
                  backSpeed={50}
                  loop
                  onStringTyped={(index) => {
                    const words = Object.keys(wordColors);
                    setCurrentColor(wordColors[words[index]]);
                  }}
                />
              </Heading>
            </Box>
          </HStack>
          <Heading fontSize={{base: "50px", md: "70px", lg: "80px"}} color="aleocal.coal">
            without sharing calendars
          </Heading>
        </VStack>
        <VStack spacing={4}>
          <Button
            onClick={nextPage}
            size="lg"
            px={10}
            py={6}
            fontSize="xl"
            bg="aleocal.pomelo"
            color="aleocal.coal"
            borderColor="aleocal.coal"
            _hover={{ bg: "aleocal.lime" }}
          >
            Try <Box as="span" color="aleocal.tangerine" mx={1}>{appName}</Box> now
          </Button>
          <Text fontSize="sm" color="aleocal.coal" opacity={0.6}>
            Built on Aleo • Powered by Zero-Knowledge
          </Text>
        </VStack>
      </VStack>
    </VStack>
  </>;
}