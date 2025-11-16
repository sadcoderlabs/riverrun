import type { Signer } from 'ethers';
import { useCallback, useState } from 'react';
import type { OrderExchangeResult } from '../../../../contexts/order/application/ports/OrderExchangePort';
import type { PlaceOrderUseCase } from '../../../../contexts/order/application/usecases/PlaceOrderUseCase';
import { useContainer } from '../../../di/AppServicesProvider';
import { mapFormToCommand } from '../viewModels/orderFormMapper';

export type PlaceOrderFormValues = {
  coin: string;
  size: string;
  side: 'Long' | 'Short';
  orderType: 'Market' | 'Limit';
  limitPrice?: number;
  marketPrice?: number;
  reduceOnly?: boolean;
  tpSl?: {
    take?: { trigger: number; limit?: number };
    stop?: { trigger: number; limit?: number };
  };
};

export function usePlaceOrder(signer: Signer) {
  const placeOrderUseCase = useContainer<PlaceOrderUseCase>(container =>
    container.resolve('placeOrderUseCase'),
  );
  const [lastResult, setLastResult] = useState<OrderExchangeResult | undefined>();
  const [isSubmitting, setSubmitting] = useState(false);

  const placeOrder = useCallback(
    async (form: PlaceOrderFormValues) => {
      setSubmitting(true);
      try {
        const command = { ...mapFormToCommand(form), signer };
        const result = await placeOrderUseCase.execute(command);
        setLastResult(result);
        return result;
      } finally {
        setSubmitting(false);
      }
    },
    [placeOrderUseCase, signer],
  );

  return { placeOrder, isSubmitting, lastResult };
}
