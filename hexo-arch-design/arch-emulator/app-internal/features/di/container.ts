import { createContainer, asFunction, asValue, type AwilixContainer } from 'awilix';
import type { BuilderFeeApprovalPort } from '../../../contexts/order/application/ports/BuilderFeeApprovalPort';
import type { OrderExchangePort } from '../../../contexts/order/application/ports/OrderExchangePort';
import type { OrderTelemetryPort } from '../../../contexts/order/application/ports/OrderTelemetryPort';
import { PlaceOrderUseCase } from '../../../contexts/order/application/usecases/PlaceOrderUseCase';

export type AppContainerDeps = {
  exchangePort: OrderExchangePort;
  builderFeePort: BuilderFeeApprovalPort;
  telemetryPort: OrderTelemetryPort;
};

export type AppCradle = {
  exchangePort: OrderExchangePort;
  builderFeePort: BuilderFeeApprovalPort;
  telemetryPort: OrderTelemetryPort;
  placeOrderUseCase: PlaceOrderUseCase;
};

export type AppContainer = AwilixContainer<AppCradle>;

export function createAppContainer(deps: AppContainerDeps): AppContainer {
  const container = createContainer<AppCradle>();

  container.register({
    exchangePort: asValue(deps.exchangePort),
    builderFeePort: asValue(deps.builderFeePort),
    telemetryPort: asValue(deps.telemetryPort),
    placeOrderUseCase: asFunction(
      ({ exchangePort, builderFeePort, telemetryPort }: AppCradle) =>
        new PlaceOrderUseCase(exchangePort, builderFeePort, telemetryPort),
    ).singleton(),
  });

  return container;
}
