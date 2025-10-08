import { ListItem } from '@/components/global/list-item';
import { ListSection } from '@/components/global/list-section';
import { YStack } from 'tamagui';

export default function ThemeOptions() {
  return (
    <YStack>
      <ListSection label="Theme">
        <ListItem key="dark" title="Dark" isChecked={false} />
        <ListItem key="light" title="Light" isChecked={true} />
        <ListItem key="system" title="System" isChecked={false} />
      </ListSection>
    </YStack>
  );
}
