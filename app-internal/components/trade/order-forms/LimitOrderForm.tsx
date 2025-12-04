import { Input } from '@/app-internal/components/global/Input';
import { OrderSizeInput } from '@/app-internal/components/trade/OrderSizeInput';
import { roundOrderPrice } from '@/infra/hyperliquid/format/roundOrderPrice';
import { Text, XStack, YStack } from 'tamagui';

/**
 * LimitOrderForm Component
 *
 * This component handles limit order placement with the following behavior:
 *
 * 1. INPUT FIELDS:
 *    - Both Limit Price and Size can be manually edited by the user
 *    - Limit Price can be valid (has value) or invalid (empty/zero) - both are acceptable
 *
 * 2. SIZE INPUT BEHAVIOR:
 *    - Size always reflects: current unit + user's last triggered input
 *    - User input sources:
 *      a) Direct keyboard input (manual typing)
 *      b) Percentage buttons (25%, 50%, 75%, 100%)
 *      c) Slider (0-100%)
 *
 * 3. SIZE CALCULATION FOR PERCENTAGE/SLIDER:
 *    - Formula: (availableToTrade * percentage/100 * leverage) / price
 *    - Price priority:
 *      - If user has entered valid Limit Price → use Limit Price
 *      - If Limit Price is invalid → use current market price
 *
 * 4. PRICE BEHAVIOR:
 *    - Market price is NOT constantly updated in real-time
 *    - Price is only used for calculation when it changes (not on every tick)
 *    - This prevents unwanted recalculation of size during price fluctuations
 *
 * 5. UNIT MODE BEHAVIOR:
 *    - ASSET mode: Asset value stays unchanged when price changes, USD estimate updates
 *    - USD mode: USD value stays unchanged when price changes, asset quantity recalculates
 *    - This preserves the user's intended input value regardless of price movements
 */

interface LimitOrderFormProps {
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  size: string;
  onSizeChange: (value: string) => void;
  leverage: number;
  availableToTrade: number;
  midPrice: number | undefined;
  markPrice: number;
  displayName: string;
  szDecimals: number;
}

export function LimitOrderForm({
  limitPrice,
  onLimitPriceChange,
  size,
  onSizeChange,
  leverage,
  availableToTrade,
  midPrice,
  markPrice,
  displayName,
  szDecimals,
}: LimitOrderFormProps) {
  // Use mid price for "Mid" button, fallback to mark price if unavailable
  const priceForMidButton = midPrice ?? markPrice;

  // Calculate price for size calculations - use limit price if valid, otherwise mark price
  const hasValidLimitPrice = limitPrice && limitPrice !== '' && limitPrice !== '0';
  const priceForCalculation = hasValidLimitPrice ? parseFloat(limitPrice) : markPrice;

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
            onPress={() => onLimitPriceChange(roundOrderPrice(priceForMidButton, szDecimals))}
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
        displayName={displayName}
        szDecimals={szDecimals}
      />
    </YStack>
  );
}
