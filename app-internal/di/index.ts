/**
 * DI Module - Public API
 *
 * Exports the dependency injection infrastructure for the application.
 */

// Main composition provider
export { AppCompositionProvider } from './appComposition';

// Main provider and hook
export { AppServicesProvider, useContainer } from './AppServicesProvider';

// Types
export type { AppContainer, AppCradle } from './types';

// Container factory (rarely needed directly, but useful for testing)
export { createAppContainer } from './container';
