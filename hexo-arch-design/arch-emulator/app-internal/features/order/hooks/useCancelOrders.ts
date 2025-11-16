import type { Signer } from 'ethers';
import { useCallback, useState } from 'react';
import type {
  CancelOrdersCommand,
  CancelOrdersUseCase,
  OrderResult,
} from '../../../../contexts/order/application/usecases/CancelOrdersUseCase';
import { useContainer } from '../../di/AppServicesProvider';

export function useCancelOrders(signer: Signer) {
  const cancelOrdersUseCase = useContainer<CancelOrdersUseCase>(container =>
    container.resolve('cancelOrdersUseCase'),
  );
  const [lastResult, setLastResult] = useState<OrderResult | undefined>();
  const [isSubmitting, setSubmitting] = useState(false);

  const cancelOrders = useCallback(
    async (clientOrderIds: CancelOrdersCommand['clientOrderIds']) => {
      setSubmitting(true);
      try {
        const command: CancelOrdersCommand = { signer, clientOrderIds };
        const result = await cancelOrdersUseCase.execute(command);
        setLastResult(result);
        return result;
      } finally {
        setSubmitting(false);
      }
    },
    [cancelOrdersUseCase, signer],
  );

  return { cancelOrders, isSubmitting, lastResult };
}
