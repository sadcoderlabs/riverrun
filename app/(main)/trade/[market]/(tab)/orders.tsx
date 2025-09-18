import { MainLayout } from '@/components/global/main-layout';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'tamagui';

export default function OrdersScreen() {
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
          {market} Orders
        </Text>
        <Text marginTop="$4">Your orders will appear here</Text>
      </View>
    </MainLayout>
  );
}
