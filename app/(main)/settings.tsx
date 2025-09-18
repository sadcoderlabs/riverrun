import { useAppKit } from "@reown/appkit-wagmi-react-native";
import { Text, View } from "react-native";
import { Button } from "tamagui";

export default function Index() {
  const { open } = useAppKit()
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>This is settings screen</Text>
      <Button onPress={() => open()}>Disconnect Wallet</Button>
    </View>
  );
}
