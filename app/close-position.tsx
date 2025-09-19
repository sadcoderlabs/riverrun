import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text, View, YStack } from 'tamagui';

export default function ClosePositionScreen() {
  const { positionId } = useLocalSearchParams<{ positionId: string }>();
  const router = useRouter();

  const handleClose = () => {
    // Logic to close position would go here
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
    >
      <YStack space="$4" width="100%" maxWidth={400} alignItems="center">
        <Text fontFamily="$interSemiBold" style={{ fontSize: 18 }}>
          Close Position
        </Text>
        <Text>Are you sure you want to close position {positionId}?</Text>
        <YStack space="$2" width="100%">
          <Button backgroundColor="$red9" onPress={handleClose}>
            <Text color="white">Close Position</Text>
          </Button>
          <Button variant="outlined" onPress={handleCancel}>
            <Text>Cancel</Text>
          </Button>
        </YStack>
      </YStack>
    </View>
  );
}
