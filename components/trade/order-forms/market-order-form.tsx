import { OrderSizeInput } from '@/components/trade/order-size-input';

interface MarketOrderFormProps {
  size: string;
  onSizeChange: (value: string) => void;
  leverage: number;
  accountBalance: number;
  marketPrice: number;
}

export function MarketOrderForm({
  size,
  onSizeChange,
  leverage,
  accountBalance,
  marketPrice,
}: MarketOrderFormProps) {
  return (
    <OrderSizeInput
      size={size}
      onSizeChange={onSizeChange}
      leverage={leverage}
      accountBalance={accountBalance}
      marketPrice={marketPrice}
    />
  );
}
