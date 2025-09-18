import { Link } from "expo-router";
import { Text, View } from "tamagui";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Link href="/(main)/settings">Settings</Link>
      <Text>Home screen</Text>
    </View>
  );
}