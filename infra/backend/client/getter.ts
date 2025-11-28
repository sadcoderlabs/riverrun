/**
 * Backend API Client - Base URL Configuration
 *
 * Provides singleton access to the backend API base URL.
 * URL is configured via BACKEND_API_BASE_URL environment variable.
 */

import Constants from 'expo-constants';

/**
 * Get the backend API base URL
 *
 * @returns The base URL for backend API calls
 * @throws Error if BACKEND_API_BASE_URL is not configured
 *
 * @example
 * ```typescript
 * const url = getBaseUrl();
 * // Returns: "https://api.example.com"
 * ```
 */
export function getBaseUrl(): string {
  const baseUrl: string | undefined = Constants.expoConfig?.extra?.backendApiBaseUrl;
  if (!baseUrl) {
    throw new Error('[Backend] BACKEND_API_BASE_URL not configured');
  }
  return baseUrl;
}
