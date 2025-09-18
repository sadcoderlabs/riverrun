import { MainLayout } from '@/components/global/main-layout';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'tamagui';

export default function TradeIndex() {
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
          Trading {market}
        </Text>
        <Text marginTop="$4">Trading interface will be implemented here</Text>
      </View>
    </MainLayout>
  );
}
