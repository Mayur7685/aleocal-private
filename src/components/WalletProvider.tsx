// Aleo Wallet Provider for AleoCal
// Uses @provablehq/aleo-wallet-adaptor-* for Shield + Leo wallet support
import React, { useMemo } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';

// Import wallet adapter styles
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const wallets = useMemo(() => {
    const adapters = [];

    // Shield Wallet - privacy-focused Aleo wallet
    try {
      adapters.push(new ShieldWalletAdapter());
    } catch (e) {
      console.warn('Failed to initialize Shield Wallet adapter:', e);
    }

    // Leo Wallet - most popular Aleo wallet
    try {
      adapters.push(new LeoWalletAdapter());
    } catch (e) {
      console.warn('Failed to initialize Leo Wallet adapter:', e);
    }

    return adapters;
  }, []);

  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.UponRequest}
      autoConnect={false}
      onError={error => console.error('[WalletProvider] Error:', error)}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
};

export default WalletProvider;
