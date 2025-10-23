import { Input } from '@/components/global/input';
import { OrderSizeInput } from '@/components/trade/order-size-input';
import { Text, XStack, YStack } from 'tamagui';

interface LimitOrderFormProps {
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  size: string;
  onSizeChange: (value: string) => void;
  leverage: number;
  availableToTrade: number;
  marketPrice: number;
  assetSymbol: string;
}

export function LimitOrderForm({
  limitPrice,
  onLimitPriceChange,
  size,
  onSizeChange,
  leverage,
  availableToTrade,
  marketPrice,
  assetSymbol,
}: LimitOrderFormProps) {
  // Determine which price to use for size calculation
  // If limitPrice is valid (not empty and not zero), use it; otherwise use marketPrice
  const hasValidLimitPrice = limitPrice && limitPrice !== '' && limitPrice !== '0';
  const priceForCalculation = hasValidLimitPrice ? parseFloat(limitPrice) : marketPrice;

  return (
    <YStack gap="$2.5">
      {/* Limit Price */}
      <YStack gap="$1.5">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
            Limit Price
          </Text>
          <Text
            fontFamily="$interRegular"
            fontSize="$2"
            color="$accent9"
            onPress={() => onLimitPriceChange(marketPrice.toFixed(1))}
            pressStyle={{ opacity: 0.7 }}
          >
            Mid
          </Text>
        </XStack>
        <XStack
          backgroundColor="$gray3"
          borderRadius="$3"
          paddingVertical="$1.5"
          paddingHorizontal="$2.5"
          borderColor="$gray8"
          borderWidth={1}
          alignItems="center"
          height="$3"
        >
          <Input
            flex={1}
            placeholder="0.0"
            value={limitPrice}
            onChangeText={onLimitPriceChange}
            keyboardType="numeric"
            returnKeyType="done"
            fontSize="$3"
            fontFamily="$interRegular"
            borderWidth={0}
            paddingHorizontal={0}
            paddingVertical={0}
          />
          <Text fontFamily="$interSemiBold" fontSize="$2" color="$gray10" marginLeft="$2">
            USD
          </Text>
        </XStack>
      </YStack>

      {/* Size Input Section */}
      <OrderSizeInput
        size={size}
        onSizeChange={onSizeChange}
        leverage={leverage}
        availableToTrade={availableToTrade}
        priceForCalculation={priceForCalculation}
        assetSymbol={assetSymbol}
      />
    </YStack>
  );
}
