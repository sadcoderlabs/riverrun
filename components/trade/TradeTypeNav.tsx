import { useRouter } from 'expo-router';
import { XStack, Text } from 'tamagui';

type TradeType = 'perp' | 'spot' | 'equities';

interface TradeTypeNavProps {
  currentType: TradeType;
  asset?: string;
}

export function TradeTypeNav({ currentType, asset = 'BTC' }: TradeTypeNavProps) {
  const router = useRouter();

  const tabs: { key: TradeType; label: string; enabled: boolean }[] = [
    { key: 'perp', label: 'Perp', enabled: true },
    { key: 'spot', label: 'Spot', enabled: true },
    { key: 'equities', label: 'Equities', enabled: false },
  ];

  const handleTabPress = (type: TradeType) => {
    if (!tabs.find(t => t.key === type)?.enabled) return;
    if (type === currentType) return;

    // Navigate to the new trade type with the same asset
    // Note: perp uses [coin], spot uses [market]
    if (type === 'perp') {
      router.replace(`/trade/perp/${asset}` as any);
    } else if (type === 'spot') {
      router.replace(`/trade/spot/${asset}` as any);
    }
  };

  return (
    <XStack gap="$4" paddingHorizontal="$4" paddingVertical="$2">
      {tabs.map(tab => {
        const isActive = tab.key === currentType;
        const isDisabled = !tab.enabled;

        return (
          <Text
            key={tab.key}
            fontFamily={isActive ? '$interSemiBold' : '$interRegular'}
            fontSize="$4"
            color={isDisabled ? '$gray8' : isActive ? '$accent10' : '$gray10'}
            onPress={() => handleTabPress(tab.key)}
            pressStyle={isDisabled ? {} : { opacity: 0.7 }}
            cursor={isDisabled ? 'default' : 'pointer'}
          >
            {tab.label}
          </Text>
        );
      })}
    </XStack>
  );
}
