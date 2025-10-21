import { useRouter, usePathname } from 'expo-router';
import { XStack, Text } from 'tamagui';

type TradeType = 'perp' | 'spot' | 'equities' | 'swap';

interface TradeTypeNavProps {
  currentType: TradeType;
  market?: string;
}

export function TradeTypeNav({ currentType, market = 'BTC-USD' }: TradeTypeNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const tabs: { key: TradeType; label: string; enabled: boolean }[] = [
    { key: 'perp', label: 'Perps', enabled: true },
    { key: 'spot', label: 'Spot', enabled: true },
    { key: 'equities', label: 'Equities', enabled: false },
    { key: 'swap', label: 'Swap', enabled: false },
  ];

  const handleTabPress = (type: TradeType) => {
    if (!tabs.find((t) => t.key === type)?.enabled) return;
    if (type === currentType) return;

    // Navigate to the new trade type with the same market
    router.replace(`/trade/${type}/${market}` as any);
  };

  return (
    <XStack gap="$5" paddingHorizontal="$4" paddingVertical="$3">
      {tabs.map((tab) => {
        const isActive = tab.key === currentType;
        const isDisabled = !tab.enabled;

        return (
          <Text
            key={tab.key}
            fontFamily={isActive ? '$interSemiBold' : '$interRegular'}
            fontSize="$5"
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
