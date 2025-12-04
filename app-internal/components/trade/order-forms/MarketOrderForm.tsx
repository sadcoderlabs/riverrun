import { OrderSizeInput } from '@/app-internal/components/trade/OrderSizeInput';

interface MarketOrderFormProps {
  size: string;
  onSizeChange: (value: string) => void;
  leverage: number;
  availableToTrade: number;
  markPrice: number;
  displayName: string;
  szDecimals: number;
}

export function MarketOrderForm({
  size,
  onSizeChange,
  leverage,
  availableToTrade,
  markPrice,
  displayName,
  szDecimals,
}: MarketOrderFormProps) {
  return (
    <OrderSizeInput
      size={size}
      onSizeChange={onSizeChange}
      leverage={leverage}
      availableToTrade={availableToTrade}
      priceForCalculation={markPrice}
      displayName={displayName}
      szDecimals={szDecimals}
    />
  );
}
