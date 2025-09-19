import { MainLayout } from '@/components/global/main-layout';
import { Text, View } from 'tamagui';

export default function AccountIndexScreen() {
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
          Account Overview
        </Text>
        <Text marginTop="$4">Your account information will appear here</Text>
      </View>
    </MainLayout>
  );
}
