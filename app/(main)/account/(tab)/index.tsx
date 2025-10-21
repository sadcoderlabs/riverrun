import { Text, YStack } from 'tamagui';

export default function AccountIndexScreen() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$gray3">
      <Text fontFamily="$interSemiBold" fontSize="$5">
        Account Overview
      </Text>
      <Text marginTop="$4" color="$gray10">
        Your account information will appear here
      </Text>
    </YStack>
  );
}
