import AdaptiveSelect from '@/components/global/AdaptiveSelect';
import { ChevronDown } from '@tamagui/lucide-icons';
import { Text, XStack } from 'tamagui';

export type OrderType = 'Market' | 'Limit';

interface OrderTypeSelectorProps {
  value: OrderType;
  onValueChange: (value: OrderType) => void;
}

export function OrderTypeSelector({ value, onValueChange }: OrderTypeSelectorProps) {
  const orderTypeItems = [
    { value: 'Market', label: 'Market' },
    { value: 'Limit', label: 'Limit' },
  ];

  return (
    <AdaptiveSelect
      value={value}
      onValueChange={value => onValueChange(value as OrderType)}
      title="Order Type"
    >
      <AdaptiveSelect.Trigger>
        <XStack
          backgroundColor="$gray3"
          borderRadius="$3"
          paddingVertical="$2"
          paddingHorizontal="$2.5"
          borderColor="$gray8"
          borderWidth={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Text color="$color" fontSize="$2" fontFamily="$interRegular">
            {value}
          </Text>
          <ChevronDown size="$0.75" color="$color" />
        </XStack>
      </AdaptiveSelect.Trigger>

      {orderTypeItems.map((item, index) => (
        <AdaptiveSelect.Item key={item.value} value={item.value} index={index}>
          {item.label}
        </AdaptiveSelect.Item>
      ))}
    </AdaptiveSelect>
  );
}
