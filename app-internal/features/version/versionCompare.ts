/**
 * Version comparison utilities for semantic versioning
 *
 * Supports comparing version strings in the format: MAJOR.MINOR.PATCH
 * Examples: "1.0.0", "1.2.3", "2.0.0"
 */

/**
 * Parse a semantic version string into its components
 *
 * @param version - Version string (e.g., "1.2.3")
 * @returns Array of [major, minor, patch] numbers
 * @throws Error if version format is invalid
 */
function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.').map(Number);

  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}. Expected format: MAJOR.MINOR.PATCH`);
  }

  return [parts[0], parts[1], parts[2]];
}

/**
 * Compare two semantic version strings
 *
 * @param v1 - First version string
 * @param v2 - Second version string
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 *
 * @example
 * compareVersion("1.0.0", "1.0.1") // -1
 * compareVersion("1.2.3", "1.2.3") // 0
 * compareVersion("2.0.0", "1.9.9") // 1
 */
export function compareVersion(v1: string, v2: string): -1 | 0 | 1 {
  const [major1, minor1, patch1] = parseVersion(v1);
  const [major2, minor2, patch2] = parseVersion(v2);

  // Compare major version
  if (major1 !== major2) {
    return major1 > major2 ? 1 : -1;
  }

  // Compare minor version
  if (minor1 !== minor2) {
    return minor1 > minor2 ? 1 : -1;
  }

  // Compare patch version
  if (patch1 !== patch2) {
    return patch1 > patch2 ? 1 : -1;
  }

  // Versions are equal
  return 0;
}

/**
 * Check if the current version is older than the target version
 *
 * @param currentVersion - Current app version
 * @param targetVersion - Target version to compare against
 * @returns True if current version is older (update needed)
 *
 * @example
 * isVersionNewer("1.0.0", "1.0.1") // true (1.0.1 is newer)
 * isVersionNewer("1.2.3", "1.2.3") // false (same version)
 * isVersionNewer("2.0.0", "1.9.9") // false (current is newer)
 */
export function isVersionNewer(currentVersion: string, targetVersion: string): boolean {
  return compareVersion(currentVersion, targetVersion) === -1;
}

/**
 * Check if the current version meets the minimum required version
 *
 * @param currentVersion - Current app version
 * @param minVersion - Minimum required version
 * @returns True if current version meets or exceeds minimum
 *
 * @example
 * meetsMinimumVersion("1.0.0", "1.0.0") // true
 * meetsMinimumVersion("1.2.3", "1.0.0") // true
 * meetsMinimumVersion("0.9.9", "1.0.0") // false
 */
export function meetsMinimumVersion(currentVersion: string, minVersion: string): boolean {
  return compareVersion(currentVersion, minVersion) >= 0;
}
