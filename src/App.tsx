// AleoCal - Zero-Knowledge Calendar Scheduling
// Privacy-preserving calendar matching using zero-knowledge proofs on Aleo
import * as React from "react"
import { useState, useEffect } from "react";
import {
  ChakraProvider,
  extendTheme,
  Button,
  HStack,
} from "@chakra-ui/react";

import { Calender } from "./components/Calender";
import { HomePage } from "./components/HomePage";
import { ConnectWallet } from "./components/ConnectWallet";
import { AddParticipants } from "./components/AddParticipants";
import { Results } from "./components/Results";
import { Finalize } from "./components/Final";
import { WalletProvider } from "./components/WalletProvider";
import { AleoAccount, MeetingResult } from "./aleo/types";

const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

// AleoCal color palette
const theme = extendTheme({
  config,
  colors: {
    aleocal: {
      ivory: '#F5F5F5',
      coal: '#121212',
      stone: '#E3E3E3',
      pomelo: '#FFE092',
      lime: '#C4FFC2',
      cloudberry: '#FFE2FC',
      tangerine: '#FFA978',
    },
  },
  styles: {
    global: {
      body: { bg: '#F5F5F5', color: '#121212' },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'normal',
        borderRadius: '20px',
        border: '1px solid',
        borderColor: '#121212',
      },
      variants: {
        solid: (props: any) => ({
          bg: 'aleocal.pomelo',
          color: '#121212',
          borderColor: '#121212',
          _hover: { bg: 'aleocal.tangerine' },
        }),
        outline: {
          borderColor: '#121212',
          color: '#121212',
          _hover: { bg: 'aleocal.stone' },
        },
      },
      defaultProps: { variant: 'solid' },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderColor: 'aleocal.stone',
            _hover: { borderColor: '#121212' },
            _focus: { borderColor: '#121212', boxShadow: 'none' },
          },
        },
      },
      defaultProps: { variant: 'outline' },
    },
    Heading: { baseStyle: { fontWeight: 'normal' } },
    Badge: { baseStyle: { fontWeight: 'normal' } },
  },
});

const appName = "AleoCal";

export interface UserContextType {
  aleoAccount: AleoAccount | null;
  setAleoAccount: React.Dispatch<React.SetStateAction<AleoAccount | null>>;

  // meetingId = plain number string used as Aleo field value (no "field" suffix)
  meetingId: string | null;
  setMeetingId: React.Dispatch<React.SetStateAction<string | null>>;

  partyBit: number | null;
  setPartyBit: React.Dispatch<React.SetStateAction<number | null>>;

  otherPartyAddress: string | null;
  setOtherPartyAddress: React.Dispatch<React.SetStateAction<string | null>>;

  myCalendarRecord: string | null;
  setMyCalendarRecord: React.Dispatch<React.SetStateAction<string | null>>;

  myCalendarSlots: number[] | null;
  setMyCalendarSlots: React.Dispatch<React.SetStateAction<number[] | null>>;
  otherCalendarSlots: number[] | null;
  setOtherCalendarSlots: React.Dispatch<React.SetStateAction<number[] | null>>;

  myCommitment: string | null;
  setMyCommitment: React.Dispatch<React.SetStateAction<string | null>>;
  otherCommitment: string | null;
  setOtherCommitment: React.Dispatch<React.SetStateAction<string | null>>;

  myReady: boolean;
  setMyReady: React.Dispatch<React.SetStateAction<boolean>>;
  otherReady: boolean;
  setOtherReady: React.Dispatch<React.SetStateAction<boolean>>;

  // Socket.io client stored here
  signalingChannel: any;
  setSignalingChannel: React.Dispatch<React.SetStateAction<any>>;

  result: MeetingResult | null;
  setResult: React.Dispatch<React.SetStateAction<MeetingResult | null>>;

  salt: string | null;
  setSalt: React.Dispatch<React.SetStateAction<string | null>>;

  serverUrl: string;

  // true when app was opened via a meeting link (joiner auto-join)
  autoJoin: boolean;
  setAutoJoin: React.Dispatch<React.SetStateAction<boolean>>;
}

export const UserContext = React.createContext<UserContextType | null>(null);

export const App = () => {
  const numPages = 6;
  const [page, setPage] = useState<number>(0);

  function handleScroll() {
    window.scrollBy({ top: 0, left: window.innerWidth, behavior: 'smooth' });
  }

  const nextPage = () => {
    setPage(p => (p === (numPages - 1)) ? p : (p + 1));
    handleScroll();
  }

  const [aleoAccount, setAleoAccount] = useState<AleoAccount | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [partyBit, setPartyBit] = useState<number | null>(null);
  const [otherPartyAddress, setOtherPartyAddress] = useState<string | null>(null);
  const [myCalendarRecord, setMyCalendarRecord] = useState<string | null>(null);
  const [myCalendarSlots, setMyCalendarSlots] = useState<number[] | null>(null);
  const [otherCalendarSlots, setOtherCalendarSlots] = useState<number[] | null>(null);
  const [myCommitment, setMyCommitment] = useState<string | null>(null);
  const [otherCommitment, setOtherCommitment] = useState<string | null>(null);
  const [myReady, setMyReady] = useState<boolean>(false);
  const [otherReady, setOtherReady] = useState<boolean>(false);
  const [signalingChannel, setSignalingChannel] = useState<any>(null);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [salt, setSalt] = useState<string | null>(null);
  const [autoJoin, setAutoJoin] = useState<boolean>(false);

  const serverUrl = (import.meta.env.VITE_SIGNALING_URL as string) || 'http://localhost:3030';

  // Detect meeting link on load: ?m={meetingId}&h={hostAddress}
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mId = params.get('m');
    const hostAddr = params.get('h');

    if (mId && hostAddr) {
      console.log('[App] Auto-join from URL:', mId);
      setMeetingId(mId);
      setOtherPartyAddress(hostAddr);
      setPartyBit(1); // joiner
      setAutoJoin(true);
      // Skip HomePage → go to ConnectWallet
      setTimeout(() => {
        setPage(1);
        window.scrollTo({ left: window.innerWidth, behavior: 'smooth' });
      }, 100);
    }
  }, []); // run once on mount

  const canProceed = (p: number): boolean => {
    switch (p) {
      case 0: return true;
      case 1: return aleoAccount !== null;
      case 2: return meetingId !== null;
      case 3: return true;
      default: return true;
    }
  }

  const contextValue: UserContextType = {
    aleoAccount, setAleoAccount,
    meetingId, setMeetingId,
    partyBit, setPartyBit,
    otherPartyAddress, setOtherPartyAddress,
    myCalendarRecord, setMyCalendarRecord,
    myCalendarSlots, setMyCalendarSlots,
    otherCalendarSlots, setOtherCalendarSlots,
    myCommitment, setMyCommitment,
    otherCommitment, setOtherCommitment,
    myReady, setMyReady,
    otherReady, setOtherReady,
    signalingChannel, setSignalingChannel,
    result, setResult,
    salt, setSalt,
    serverUrl,
    autoJoin, setAutoJoin,
  };

  return <ChakraProvider theme={theme}>
    <WalletProvider>
      <UserContext.Provider value={contextValue}>
        <HStack
          alignItems="start"
          overflowX="hidden"
          style={{ transition: "all 0.2s linear" }}
          position={"fixed"}
          left={-page * window.innerWidth}
        >
          <HomePage appName={appName} nextPage={nextPage} />
          <ConnectWallet nextPage={nextPage} />
          <AddParticipants nextPage={nextPage} />
          <Calender nextPage={nextPage} />
          <Results nextPage={nextPage} />
          <Finalize />
        </HStack>

        <Button
          size="lg"
          position={"fixed"}
          left={10}
          bottom={"50%"}
          borderRadius={30}
          isDisabled={page === 0}
          onClick={() => setPage(p => p === 0 ? p : (p - 1))}
        >
          {"⟨"}
        </Button>

        <Button
          size="lg"
          position={"fixed"}
          right={10}
          bottom={"50%"}
          borderRadius={30}
          isDisabled={(page === (numPages - 1)) || !canProceed(page)}
          onClick={nextPage}
        >
          {"⟩"}
        </Button>
      </UserContext.Provider>
    </WalletProvider>
  </ChakraProvider>
}
