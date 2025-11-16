import { useCallback, useState } from 'react';
import type { BuilderFeeStatus } from '../../../../contexts/builderFee/application/ports/BuilderFeeStatePort';
import type { EnsureBuilderFeeApprovalUseCase } from '../../../../contexts/builderFee/application/usecases/EnsureBuilderFeeApprovalUseCase';
import { useContainer } from '../../../di/AppServicesProvider';

export function useBuilderFeeApproval() {
  const ensureUseCase = useContainer<EnsureBuilderFeeApprovalUseCase>(container =>
    container.resolve('ensureBuilderFeeApprovalUseCase'),
  );
  const [status, setStatus] = useState<BuilderFeeStatus | undefined>();
  const [isLoading, setLoading] = useState(false);

  const ensureApproval = useCallback(async () => {
    setLoading(true);
    try {
      const nextStatus = await ensureUseCase.execute();
      setStatus(nextStatus);
      return nextStatus;
    } finally {
      setLoading(false);
    }
  }, [ensureUseCase]);

  return { status, isLoading, ensureApproval };
}
