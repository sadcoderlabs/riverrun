import { LeverageAdjustmentModal } from '@/components/trade/LeverageAdjustmentModal';
import { ChevronDown } from '@tamagui/lucide-icons';
import { useState } from 'react';
import { Text, XStack } from 'tamagui';

interface LeverageSelectorProps {
  leverage: number;
  marginMode: string;
  coin: string;
}

export function LeverageSelector({ leverage, marginMode, coin }: LeverageSelectorProps) {
  const [leverageModalOpen, setLeverageModalOpen] = useState(false);

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
        <Text color="$color" fontSize="$2" fontFamily="$interRegular">
          {leverage}x {marginMode.toUpperCase()}
        </Text>
        <ChevronDown size="$0.75" color="$color" />
      </XStack>

      {/* Leverage Adjustment Modal */}
      <LeverageAdjustmentModal
        open={leverageModalOpen}
        onOpenChange={setLeverageModalOpen}
        leverage={leverage}
        marginMode={marginMode}
        coin={coin}
      />
    </>
  );
}
