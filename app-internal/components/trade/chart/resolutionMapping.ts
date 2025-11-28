/**
 * Resolution Mapping between TradingView and Hyperliquid
 *
 * TradingView uses its own resolution format (e.g., "1", "60", "D")
 * while Hyperliquid uses a different format (e.g., "1m", "1h", "1d")
 */

import type { CandleInterval } from '@/infra/hyperliquid/hooks/useCandleSnapshot';

/**
 * Map TradingView resolution to Hyperliquid interval
 */
export const TV_TO_HL_RESOLUTION: Record<string, CandleInterval> = {
  // Minutes
  '1': '1m',
  '3': '3m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  // Hours (TradingView uses minutes)
  '60': '1h',
  '120': '2h',
  '240': '4h',
  '480': '8h',
  '720': '12h',
  // Days
  D: '1d',
  '1D': '1d',
  '3D': '3d',
  // Weeks
  W: '1w',
  '1W': '1w',
  // Months
  M: '1M',
  '1M': '1M',
};

/**
 * Map Hyperliquid interval to TradingView resolution
 */
export const HL_TO_TV_RESOLUTION: Record<CandleInterval, string> = {
  '1m': '1',
  '3m': '3',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '2h': '120',
  '4h': '240',
  '8h': '480',
  '12h': '720',
  '1d': '1D',
  '3d': '3D',
  '1w': '1W',
  '1M': '1M',
};

/**
 * Supported TradingView resolutions
 */
export const SUPPORTED_RESOLUTIONS = [
  '1',
  '3',
  '5',
  '15',
  '30',
  '60',
  '120',
  '240',
  '480',
  '720',
  '1D',
  '3D',
  '1W',
  '1M',
] as const;

/**
 * Convert TradingView resolution to Hyperliquid interval
 */
export function tvToHlResolution(tvResolution: string): CandleInterval {
  const interval = TV_TO_HL_RESOLUTION[tvResolution];
  if (!interval) {
    // Default to 1h if unknown resolution
    console.warn(`Unknown TradingView resolution: ${tvResolution}, defaulting to 1h`);
    return '1h';
  }
  return interval;
}

/**
 * Convert Hyperliquid interval to TradingView resolution
 */
export function hlToTvResolution(hlInterval: CandleInterval): string {
  return HL_TO_TV_RESOLUTION[hlInterval];
}

/**
 * Get resolution in milliseconds for time calculations
 */
export function getResolutionMs(tvResolution: string): number {
  const hlInterval = tvToHlResolution(tvResolution);

  const MS_PER_MINUTE = 60 * 1000;
  const MS_PER_HOUR = 60 * MS_PER_MINUTE;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  const intervalMs: Record<CandleInterval, number> = {
    '1m': 1 * MS_PER_MINUTE,
    '3m': 3 * MS_PER_MINUTE,
    '5m': 5 * MS_PER_MINUTE,
    '15m': 15 * MS_PER_MINUTE,
    '30m': 30 * MS_PER_MINUTE,
    '1h': 1 * MS_PER_HOUR,
    '2h': 2 * MS_PER_HOUR,
    '4h': 4 * MS_PER_HOUR,
    '8h': 8 * MS_PER_HOUR,
    '12h': 12 * MS_PER_HOUR,
    '1d': 1 * MS_PER_DAY,
    '3d': 3 * MS_PER_DAY,
    '1w': 7 * MS_PER_DAY,
    '1M': 30 * MS_PER_DAY, // Approximate
  };

  return intervalMs[hlInterval];
}
