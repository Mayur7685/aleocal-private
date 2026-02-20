// ConnectWallet component for Aleo AleoCal - SIMPLIFIED VERSION
// Supports wallet connection without heavy WASM initialization
import * as React from "react";
import { useState, useEffect } from "react";
import {
  VStack,
  Button,
  Heading,
  Text,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Badge,
  Divider,
} from "@chakra-ui/react";
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

import { UserContext, UserContextType } from "../App";
import {
  getOrCreateAccount,
  importAccount,
  generateRandomField,
} from "../aleo";

export function addressTruncate(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.substring(0, 10) + "..." + addr.substring(addr.length - 6);
}

interface ConnectWalletProps {
  nextPage: () => void;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const ConnectWallet: React.FC<ConnectWalletProps> = ({ nextPage }) => {
  const context = React.useContext(UserContext) as UserContextType;
  const { aleoAccount, setAleoAccount, setSalt } = context;

  const [loading, setLoading] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const toast = useToast();

  // Wallet adapter hooks
  const { address, connected, disconnect, wallet, connecting } = useWallet();

  // Check if Shield or Leo wallet is installed
  const isShieldWalletInstalled = typeof window !== 'undefined' &&
    (window as any).shield !== undefined;
  const isLeoWalletInstalled = typeof window !== 'undefined' &&
    (window as any).leoWallet !== undefined;
  const isAnyWalletInstalled = isShieldWalletInstalled || isLeoWalletInstalled;

  // Sync wallet connection with app state - SIMPLIFIED (no WASM)
  useEffect(() => {
    console.log('Wallet connection state:', { connected, address, wallet: wallet?.adapter.name });

    if (connected && address && !aleoAccount) {
      console.log('Setting up wallet account (fast mode)...');

      // Use wallet address directly - skip heavy WASM initialization
      const account = {
        privateKey: '', // Will use wallet for signing
        viewKey: '',
        address: address,
      };

      console.log('Setting aleo account:', account.address);
      setAleoAccount(account);

      // Simple salt generation
      const randomSalt = `${Date.now()}${Math.random()}field`;
      setSalt(randomSalt);

      toast({
        title: "Wallet Connected",
        description: `${wallet?.adapter.name}: ${addressTruncate(address)}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Auto-navigate after short delay
      setTimeout(() => {
        console.log('Auto-navigating to next page...');
        nextPage();
      }, 800);
    }
  }, [connected, address, wallet, aleoAccount]);

  // Generate a new account or load from storage
  async function handleGenerateAccount() {
    setLoading(true);
    try {
      const account = await getOrCreateAccount();
      setAleoAccount(account);

      // Generate a random salt for commitment
      const randomSalt = await generateRandomField();
      setSalt(randomSalt);

      toast({
        title: "Account Ready",
        description: `Address: ${addressTruncate(account.address)}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setLoading(false);
      await sleep(300);
      nextPage();
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Error",
        description: error.message || "Failed to generate account",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }

  // Import an existing account from private key
  async function handleImportAccount() {
    if (!privateKeyInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a private key",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const account = await importAccount(privateKeyInput.trim());
      setAleoAccount(account);

      // Generate a random salt for commitment
      const randomSalt = await generateRandomField();
      setSalt(randomSalt);

      toast({
        title: "Account Imported",
        description: `Address: ${addressTruncate(account.address)}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setLoading(false);
      await sleep(300);
      nextPage();
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Invalid Private Key",
        description: "Please check your private key and try again",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }

  // Disconnect/clear account
  async function handleDisconnect() {
    if (connected) {
      await disconnect();
    }
    setAleoAccount(null);
    localStorage.removeItem('aleocal_aleo_account');
    toast({
      title: "Disconnected",
      description: "Account cleared",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  }

  return (
    <VStack paddingY={0} justify="space-around" alignItems="left">
      <VStack minH="100vh" justify="space-evenly" spacing={"-30vh"} minW="100vw" bg="aleocal.ivory">
        <Heading fontSize={"5xl"}>Step 1: Connect your Aleo Account</Heading>

        <Text maxW="600px" textAlign="center" color="aleocal.coal">
          Connect your Aleo wallet or generate a local account.
          All computations are performed locally using zero-knowledge proofs.
        </Text>

        {aleoAccount !== null ? (
          // Connected state
          <VStack spacing={4}>
            <HStack>
              {connected && wallet && (
                <Badge bg="aleocal.lime" color="aleocal.coal" fontSize="md" px={3} py={1} borderRadius="md">
                  {wallet.adapter.name}
                </Badge>
              )}
              {!connected && aleoAccount.privateKey && (
                <Badge bg="aleocal.cloudberry" color="aleocal.coal" fontSize="md" px={3} py={1} borderRadius="md">
                  Local Account
                </Badge>
              )}
            </HStack>

            <InputGroup size='md' maxW="500px">
              <InputLeftAddon>Address</InputLeftAddon>
              <Input value={aleoAccount.address} pr='4.5rem' readOnly />
              <InputRightElement width='4.5rem'>
                <Button size='sm' h='1.75rem' onClick={() => navigator.clipboard.writeText(aleoAccount.address)}>
                  Copy
                </Button>
              </InputRightElement>
            </InputGroup>

            <HStack spacing={3}>
              <Button
                onClick={nextPage}
                bg="aleocal.pomelo"
                color="aleocal.coal"
                borderColor="aleocal.coal"
                _hover={{ bg: "aleocal.lime" }}
                size="lg"
                px={8}
              >
                Continue to Next Step →
              </Button>

              <Button
                onClick={handleDisconnect}
                variant="outline"
                borderColor="aleocal.coal"
                color="aleocal.coal"
                _hover={{ bg: "aleocal.tangerine" }}
              >
                Disconnect
              </Button>
            </HStack>
          </VStack>
        ) : (
          // Not connected state
          <VStack spacing={6} maxW="500px">
            {/* Wallet Connection - Primary Option */}
            <VStack spacing={3} w="100%">
              <Text fontSize="lg" color="aleocal.coal">Connect Wallet (Recommended)</Text>
              <Text fontSize="sm" color="aleocal.coal" opacity={0.6} textAlign="center">
                Connect using Shield Wallet or Leo Wallet browser extension
              </Text>
              <WalletMultiButton />
              {!isAnyWalletInstalled && (
                <VStack spacing={2}>
                  <Text fontSize="xs" color="aleocal.tangerine">
                    No Aleo wallet detected
                  </Text>
                  <HStack spacing={2}>
                    <Button
                      as="a"
                      href="https://shield.moe/"
                      target="_blank"
                      size="sm"
                      variant="outline"
                      borderColor="aleocal.coal"
                      color="aleocal.coal"
                      _hover={{ bg: "aleocal.cloudberry" }}
                    >
                      Install Shield Wallet
                    </Button>
                    <Button
                      as="a"
                      href="https://leo.app/"
                      target="_blank"
                      size="sm"
                      variant="outline"
                      borderColor="aleocal.coal"
                      color="aleocal.coal"
                      _hover={{ bg: "aleocal.cloudberry" }}
                    >
                      Install Leo Wallet
                    </Button>
                  </HStack>
                </VStack>
              )}
              {isAnyWalletInstalled && !connected && (
                <Text fontSize="xs" color="aleocal.pomelo" textAlign="center">
                  Make sure your wallet is set to <strong>Testnet</strong> network
                </Text>
              )}
              {connecting && (
                <Text fontSize="sm" color="aleocal.cloudberry">
                  Connecting to wallet...
                </Text>
              )}
            </VStack>

            <HStack w="100%">
              <Divider borderColor="aleocal.stone" />
              <Text fontSize="sm" color="aleocal.coal" opacity={0.5} whiteSpace="nowrap">or</Text>
              <Divider borderColor="aleocal.stone" />
            </HStack>

            {/* Local Account Options */}
            <Tabs isFitted variant="enclosed" w="100%">
              <TabList mb="1em">
                <Tab>Generate New</Tab>
                <Tab>Import Key</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <VStack spacing={4}>
                    <Text fontSize="sm" color="aleocal.coal" opacity={0.6}>
                      Generate a new local Aleo account. Private key stored in your browser.
                    </Text>
                    <Button
                      onClick={handleGenerateAccount}
                      loadingText="Generating..."
                      isLoading={loading}
                      width="100%"
                    >
                      Generate Local Account
                    </Button>
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <VStack spacing={4}>
                    <Text fontSize="sm" color="aleocal.coal" opacity={0.6}>
                      Import an existing Aleo account using your private key.
                    </Text>
                    <Input
                      placeholder="Enter private key (APrivateKey1...)"
                      value={privateKeyInput}
                      onChange={(e) => setPrivateKeyInput(e.target.value)}
                      type="password"
                    />
                    <Button
                      onClick={handleImportAccount}
                      loadingText="Importing..."
                      isLoading={loading}
                      width="100%"
                      isDisabled={!privateKeyInput.trim()}
                    >
                      Import Account
                    </Button>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        )}

        <Text fontSize="xs" color="aleocal.coal" opacity={0.6} maxW="400px" textAlign="center">
          Powered by Aleo's zero-knowledge cryptography.
          Your calendar data is encrypted and computed privately.
        </Text>
      </VStack>
    </VStack>
  );
};
