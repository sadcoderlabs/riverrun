import '@walletconnect/react-native-compat';

import { createAppKit } from '@reown/appkit-react-native';
import { EthersAdapter } from '@reown/appkit-ethers-react-native';
import { mainnet, arbitrum } from 'viem/chains';
import { storage } from './StorageUtil';

/**
 * AppKit Configuration
 * Based on Reown AppKit documentation:
 * https://docs.reown.com/appkit/react-native/core/installation.md
 */

// 1. Get projectId at https://dashboard.reown.com
const projectId = 'REOWN_PROJECT_ID_REMOVED';

// 2. Create metadata
const metadata = {
  name: 'Riverrun',
  description: 'A trading app built by perpetual protocol',
  url: 'https://riverrun.perp.com',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
  redirect: {
    native: 'YOUR_APP_SCHEME://',
    universal: 'YOUR_APP_UNIVERSAL_LINK.com',
  },
};

// 3. Create adapter
const ethersAdapter = new EthersAdapter();

// 4. Create and export AppKit instance
export const appKit = createAppKit({
  projectId,
  metadata,
  networks: [mainnet, arbitrum],
  defaultNetwork: mainnet,
  adapters: [ethersAdapter],
  storage,
  enableAnalytics: true,
});
