import '@walletconnect/react-native-compat';

import { EthersAdapter } from '@reown/appkit-ethers-react-native';
import { createAppKit } from '@reown/appkit-react-native';
import { arbitrum } from 'viem/chains';
import { storage } from './storageUtil';

/**
 * AppKit Configuration
 * Based on Reown AppKit documentation:
 * https://docs.reown.com/appkit/react-native/core/installation.md
 */

// 1. Get projectId at https://dashboard.reown.com
// Set EXPO_PUBLIC_REOWN_PROJECT_ID in your environment or EAS secrets
const projectId = process.env.EXPO_PUBLIC_REOWN_PROJECT_ID ?? '';

if (!projectId) {
  console.warn(
    '[AppKit] EXPO_PUBLIC_REOWN_PROJECT_ID is not set. Wallet connection will not work.',
  );
}

// 2. Create metadata
const metadata = {
  name: 'PERP GO',
  description: 'Non-custodial crypto futures.',
  url: 'https://go.perp.com',
  icons: ['https://s3.ap-southeast-1.amazonaws.com/riverrun.perp.com/perp-go-icon.png'],
  redirect: {
    native: 'riverrun://',
    universal: 'YOUR_APP_UNIVERSAL_LINK.com',
  },
};

// 3. Create adapter
const ethersAdapter = new EthersAdapter();

// 4. Create and export AppKit instance
export const appKit = createAppKit({
  projectId,
  metadata,
  networks: [arbitrum],
  defaultNetwork: arbitrum,
  adapters: [ethersAdapter],
  storage,
  enableAnalytics: true,
  features: {
    socials: false, // Disable email and social logins, only show external wallets
  },
});
