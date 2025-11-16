import { createContainer, asFunction, asValue, type AwilixContainer } from 'awilix';
import type { BuilderFeeApprovalPort } from '../../../contexts/order/application/ports/BuilderFeeApprovalPort';
import type { OrderExchangePort } from '../../../contexts/order/application/ports/OrderExchangePort';
import type { OrderTelemetryPort } from '../../../contexts/order/application/ports/OrderTelemetryPort';
import { PlaceOrderUseCase } from '../../../contexts/order/application/usecases/PlaceOrderUseCase';
import { CancelOrdersUseCase } from '../../../contexts/order/application/usecases/CancelOrdersUseCase';
import type { BuilderFeeExchangePort } from '../../../contexts/builderFee/application/ports/BuilderFeeExchangePort';
import type { BuilderFeeConfirmationPort } from '../../../contexts/builderFee/application/ports/BuilderFeeConfirmationPort';
import type { BuilderFeeStatePort } from '../../../contexts/builderFee/application/ports/BuilderFeeStatePort';
import type { WalletPort } from '../../../contexts/builderFee/application/ports/WalletPort';
import { EnsureBuilderFeeApprovalUseCase } from '../../../contexts/builderFee/application/usecases/EnsureBuilderFeeApprovalUseCase';
import { BuilderFeeApprovalAdapter } from '../../../contexts/builderFee/application/services/BuilderFeeApprovalAdapter';

export type BuilderFeeDeps = {
  walletPort: WalletPort;
  builderFeeExchangePort: BuilderFeeExchangePort;
  builderFeeConfirmationPort: BuilderFeeConfirmationPort;
  builderFeeStatePort: BuilderFeeStatePort;
};

export type AppContainerDeps = {
  exchangePort: OrderExchangePort;
  telemetryPort: OrderTelemetryPort;
  builderFeePort?: BuilderFeeApprovalPort;
  builderFeeDeps?: BuilderFeeDeps;
};

export type AppCradle = {
  exchangePort: OrderExchangePort;
  builderFeePort: BuilderFeeApprovalPort;
  telemetryPort: OrderTelemetryPort;
  placeOrderUseCase: PlaceOrderUseCase;
  cancelOrdersUseCase: CancelOrdersUseCase;
  ensureBuilderFeeApprovalUseCase: EnsureBuilderFeeApprovalUseCase;
  walletPort: WalletPort;
  builderFeeExchangePort: BuilderFeeExchangePort;
  builderFeeConfirmationPort: BuilderFeeConfirmationPort;
  builderFeeStatePort: BuilderFeeStatePort;
};

export type AppContainer = AwilixContainer<AppCradle>;

export function createAppContainer(deps: AppContainerDeps): AppContainer {
  const container = createContainer<AppCradle>();

  container.register({
    exchangePort: asValue(deps.exchangePort),
    telemetryPort: asValue(deps.telemetryPort),
  });

  if (deps.builderFeePort) {
    container.register({
      builderFeePort: asValue(deps.builderFeePort),
    });
  } else if (deps.builderFeeDeps) {
    const builderDeps = deps.builderFeeDeps;
    container.register({
      walletPort: asValue(builderDeps.walletPort),
      builderFeeExchangePort: asValue(builderDeps.builderFeeExchangePort),
      builderFeeConfirmationPort: asValue(builderDeps.builderFeeConfirmationPort),
      builderFeeStatePort: asValue(builderDeps.builderFeeStatePort),
      ensureBuilderFeeApprovalUseCase: asFunction(
        ({
          walletPort,
          builderFeeExchangePort,
          builderFeeConfirmationPort,
          builderFeeStatePort,
        }: AppCradle) =>
          new EnsureBuilderFeeApprovalUseCase(
            walletPort,
            builderFeeExchangePort,
            builderFeeConfirmationPort,
            builderFeeStatePort,
          ),
      ).singleton(),
      builderFeePort: asFunction(
        ({ ensureBuilderFeeApprovalUseCase }: AppCradle) =>
          new BuilderFeeApprovalAdapter(ensureBuilderFeeApprovalUseCase),
      ).singleton(),
    });
  } else {
    throw new Error('builderFeePort or builderFeeDeps must be provided to createAppContainer');
  }

  container.register({
    placeOrderUseCase: asFunction(
      ({ exchangePort, builderFeePort, telemetryPort }: AppCradle) =>
        new PlaceOrderUseCase(exchangePort, builderFeePort, telemetryPort),
    ).singleton(),
    cancelOrdersUseCase: asFunction(
      ({ exchangePort }: AppCradle) => new CancelOrdersUseCase(exchangePort),
    ).singleton(),
  });

  return container;
}
