import Constants from 'expo-constants';

export interface VersionInfo {
  version: string;
  commitHash: string;
  displayVersion: string;
}

/**
 * Hook to access app version information
 *
 * Returns version details including:
 * - expo.version from app.json
 * - Git commit hash from EXPO_PUBLIC_GIT_COMMIT_HASH
 * - Formatted display string
 */
export function useVersion(): VersionInfo {
  const version = Constants.expoConfig?.version || 'unknown';
  const commitHash = process.env.EXPO_PUBLIC_GIT_COMMIT_HASH || 'dev';

  // Format: "1.0.0 [a1b2c3d]"
  const displayVersion = `${version} [${commitHash}]`;

  return {
    version,
    commitHash,
    displayVersion,
  };
}
