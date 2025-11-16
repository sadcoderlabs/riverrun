import { LeverageAdjustmentModal } from '@/app-internal/components/trade/LeverageAdjustmentModal';
import { useMarginStore } from '@/app-internal';
import { ChevronDown } from '@tamagui/lucide-icons';
import { useState } from 'react';
import { Text, XStack } from 'tamagui';

export function LeverageSelector() {
  const [leverageModalOpen, setLeverageModalOpen] = useState(false);

  // Get real-time margin and leverage data from margin context
  const marginLeverage = useMarginStore(state => state.marginLeverage);
  const isLoading = useMarginStore(state => state.isLoading);

  return (
    <>
      {/* Leverage & Margin Type Selector Button */}
      <XStack
        backgroundColor="$gray3"
        borderRadius="$3"
        paddingVertical="$2"
        paddingHorizontal="$2.5"
        borderColor="$gray8"
        borderWidth={1}
        alignItems="center"
        justifyContent="space-between"
        onPress={() => setLeverageModalOpen(true)}
        pressStyle={{ opacity: 0.7 }}
      >
        {isLoading || !marginLeverage ? (
          <Text color="$gray10" fontSize="$2" fontFamily="$interRegular">
            Loading...
          </Text>
        ) : (
          <Text color="$color" fontSize="$2" fontFamily="$interRegular">
            {marginLeverage.leverage}x {marginLeverage.marginMode.toUpperCase()}
          </Text>
        )}
        <ChevronDown size="$0.75" color="$color" />
      </XStack>

      {/* Leverage Adjustment Modal */}
      <LeverageAdjustmentModal open={leverageModalOpen} onOpenChange={setLeverageModalOpen} />
    </>
  );
}
