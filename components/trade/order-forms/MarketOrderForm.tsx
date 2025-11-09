import { OrderSizeInput } from '@/components/trade/OrderSizeInput';

interface MarketOrderFormProps {
  size: string;
  onSizeChange: (value: string) => void;
  leverage: number;
  availableToTrade: number;
  markPrice: number;
  coin: string;
  szDecimals: number;
}

export function MarketOrderForm({
  size,
  onSizeChange,
  leverage,
  availableToTrade,
  markPrice,
  coin,
  szDecimals,
}: MarketOrderFormProps) {
  return (
    <OrderSizeInput
      size={size}
      onSizeChange={onSizeChange}
      leverage={leverage}
      availableToTrade={availableToTrade}
      priceForCalculation={markPrice}
      coin={coin}
      szDecimals={szDecimals}
    />
  );
}
