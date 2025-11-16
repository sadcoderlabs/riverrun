import type { PlaceOrderFormValues } from '../hooks/usePlaceOrder';
import type { PlaceOrderCommand } from '../../../../contexts/order/application/usecases/PlaceOrderUseCase';

export function mapFormToCommand(form: PlaceOrderFormValues): Omit<PlaceOrderCommand, 'signer'> {
  return {
    coin: form.coin,
    size: form.size,
    side: form.side,
    orderType: form.orderType,
    limitPrice: form.limitPrice,
    marketPrice: form.marketPrice,
    reduceOnly: form.reduceOnly,
    tpSl: form.tpSl,
  };
}
