import { ListItem } from '@/components/global/list-item';
import { ListSection } from '@/components/global/list-section';
import { useThemePreference } from '@/hooks/useThemePreference';
import { type ThemePreference } from '@/store/theme.store';
import { YStack } from 'tamagui';

export default function ThemeOptions() {
  const { setPreference, preference } = useThemePreference();

  const themeOptions: { name: string; value: ThemePreference }[] = [
    { name: 'Light', value: 'light' },
    { name: 'Dark', value: 'dark' },
    { name: 'System', value: 'system' },
  ];

  return (
    <YStack backgroundColor="$gray3" flex={1}>
      <ListSection label="Theme">
        {themeOptions.map(theme => (
          <ListItem
            key={theme.value}
            title={theme.name}
            isChecked={preference === theme.value}
            onPress={() => setPreference(theme.value)}
          />
        ))}
      </ListSection>
    </YStack>
  );
}
