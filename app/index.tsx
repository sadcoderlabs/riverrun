import { useAppKit } from "@reown/appkit-wagmi-react-native";
import { Button, Text, View } from "tamagui";

export default function Index() {
  const { open } = useAppKit();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
      <Button size="$3" onPress={() => open()}>Connect Wallet</Button>
    </View>
  );
}
