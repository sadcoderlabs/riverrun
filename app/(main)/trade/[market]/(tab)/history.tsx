import { MainLayout } from '@/components/global/main-layout';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'tamagui';

export default function HistoryScreen() {
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
          {market} History
        </Text>
        <Text marginTop="$4">Your trading history will appear here</Text>
      </View>
    </MainLayout>
  );
}
