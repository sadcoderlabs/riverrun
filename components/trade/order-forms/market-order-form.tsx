import { OrderSizeInput } from '@/components/trade/order-size-input';

interface MarketOrderFormProps {
  size: string;
  onSizeChange: (value: string) => void;
  leverage: number;
  accountBalance: number;
  marketPrice: number;
  assetSymbol: string;
}

export function MarketOrderForm({
  size,
  onSizeChange,
  leverage,
  accountBalance,
  marketPrice,
  assetSymbol,
}: MarketOrderFormProps) {
  return (
    <OrderSizeInput
      size={size}
      onSizeChange={onSizeChange}
      leverage={leverage}
      accountBalance={accountBalance}
      priceForCalculation={marketPrice}
      assetSymbol={assetSymbol}
    />
  );
}
