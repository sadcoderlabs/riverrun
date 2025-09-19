import { Heading } from '@/components/global/heading';
import { MainLayout } from '@/components/global/main-layout';
import { YStack } from 'tamagui';

export default function Index() {
  return (
    <MainLayout noHeader={true} showTopBar={true}>
      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" gap="$4">
        <Heading.H1>Hello, there</Heading.H1>
      </YStack>
    </MainLayout>
  );
}
