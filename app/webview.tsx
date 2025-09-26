import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function WebViewScreen() {
  return <WebView source={{ uri: 'https://example.com/' }} style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 24,
  },
});
