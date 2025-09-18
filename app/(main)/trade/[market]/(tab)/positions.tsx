import { MainLayout } from '@/components/global/main-layout';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'tamagui';

export default function PositionsScreen() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <MainLayout>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text fontFamily="$interSemiBold" style={{ fontSize: 16 }}>
          {market} Positions
        </Text>
        <Text marginTop="$4">Your positions will appear here</Text>
      </View>
    </MainLayout>
  );
}
