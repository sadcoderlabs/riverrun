import { Search } from '@tamagui/lucide-icons';
import { Input, XStack } from 'tamagui';

export interface DepositSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/**
 * Deposit Search Bar Component
 *
 * Search input for filtering deposit tokens
 * Includes magnifying glass icon and themed styling
 */
export function DepositSearchBar({
  value,
  onChangeText,
  placeholder = 'Search tokens...',
}: DepositSearchBarProps) {
  return (
    <XStack
      backgroundColor="$background02"
      borderRadius="$4"
      alignItems="center"
      paddingHorizontal="$3"
      gap="$2"
      marginHorizontal="$4"
      marginVertical="$3"
    >
      <Search size={20} color="$gray10" />
      <Input
        flex={1}
        placeholder={placeholder}
        placeholderTextColor="$gray10"
        value={value}
        onChangeText={onChangeText}
        fontSize="$4"
        backgroundColor="transparent"
        borderWidth={0}
        paddingVertical="$3"
      />
    </XStack>
  );
}
