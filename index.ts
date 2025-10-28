// polyfill here before app/_layout.tsx
import 'react-native-get-random-values';

// make sure import @walletconnect/react-native-compat before wagmi to avoid issues
import '@walletconnect/react-native-compat';

import 'event-target-polyfill'; // `EventTarget`, `Event`, polyfill for @nktkas/hyperliquid
import 'fast-text-encoding'; // `TextEncoder` (utf-8), polyfill for @nktkas/hyperliquid

import '@ethersproject/shims'; // Polyfill for privy

import 'expo-router/entry';
