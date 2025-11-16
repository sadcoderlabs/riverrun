import { createContext, useContext, useMemo, useRef, type PropsWithChildren } from 'react';
import type { DependencyList } from 'react';
import type { AppContainer, AppContainerDeps } from './container';
import { createAppContainer } from './container';

const AppContainerContext = createContext<AppContainer | null>(null);

export type AppServicesProviderProps = PropsWithChildren<AppContainerDeps>;

export function AppServicesProvider({ children, ...deps }: AppServicesProviderProps) {
  const container = useMemo(
    () => createAppContainer(deps),
    [deps.exchangePort, deps.builderFeePort, deps.telemetryPort],
  );
  return <AppContainerContext.Provider value={container}>{children}</AppContainerContext.Provider>;
}

export function useAppContainer(): AppContainer {
  const ctx = useContext(AppContainerContext);
  if (!ctx) {
    throw new Error('useAppContainer must be used within AppServicesProvider');
  }
  return ctx;
}

export function useContainer<T>(
  selector: (container: AppContainer) => T = c => c as unknown as T,
  deps: DependencyList = [],
): T {
  const container = useAppContainer();
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  return useMemo(() => selectorRef.current(container), [container, ...deps]);
}
