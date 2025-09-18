import { MainLayout } from '@/components/global/main-layout';
import { Text, View } from 'tamagui';

export default function AccountHistoryScreen() {
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
          Account History
        </Text>
        <Text marginTop="$4">Your account history will appear here</Text>
      </View>
    </MainLayout>
  );
}
