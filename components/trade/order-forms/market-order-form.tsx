import { OrderSizeInput } from '@/components/trade/order-size-input';

interface MarketOrderFormProps {
  size: string;
  onSizeChange: (value: string) => void;
  leverage: number;
  availableToTrade: number;
  marketPrice: number;
  assetSymbol: string;
}

export function MarketOrderForm({
  size,
  onSizeChange,
  leverage,
  availableToTrade,
  marketPrice,
  assetSymbol,
}: MarketOrderFormProps) {
  return (
    <OrderSizeInput
      size={size}
      onSizeChange={onSizeChange}
      leverage={leverage}
      availableToTrade={availableToTrade}
      priceForCalculation={marketPrice}
      assetSymbol={assetSymbol}
    />
  );
}
