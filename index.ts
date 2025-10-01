// polyfill here before app/_layout.tsx
import 'react-native-get-random-values';

// make sure import @walletconnect/react-native-compat before wagmi to avoid issues
import '@walletconnect/react-native-compat';

import 'expo-router/entry';
