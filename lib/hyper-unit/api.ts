/**
 * Unit Protocol API
 * https://docs.hyperunit.xyz/developers/api
 */

// Base API URLs
const UNIT_API_BASE_URL = 'https://api.hyperunit.xyz';
const UNIT_TESTNET_API_BASE_URL = 'https://api.hyperunit-testnet.xyz';

// Use mainnet by default
const BASE_URL = UNIT_API_BASE_URL;

/**
 * Supported source chains
 */
export type SourceChain = 'bitcoin' | 'ethereum' | 'solana';

/**
 * Supported assets
 */
export type Asset = 'btc' | 'eth' | 'sol';

/**
 * Minimum deposit amounts
 */
export const MIN_DEPOSIT_AMOUNTS = {
  btc: 0.002,
  eth: 0.05,
  sol: 0.1,
} as const;

/**
 * Response from /gen endpoint
 */
export interface GenerateAddressResponse {
  address: string;
  signatures: {
    'field-node': string;
    'hl-node': string;
    'node-1': string;
  };
  status: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
}

/**
 * Generate a Unit Protocol deposit address
 *
 * @param srcChain - Source chain (bitcoin, ethereum, solana)
 * @param asset - Asset symbol (btc, eth, sol)
 * @param dstAddr - Destination Hyperliquid address
 * @returns Generated deposit address
 */
export async function generateDepositAddress(
  srcChain: SourceChain,
  asset: Asset,
  dstAddr: string,
): Promise<GenerateAddressResponse> {
  const url = `${BASE_URL}/gen/${srcChain}/hyperliquid/${asset}/${dstAddr}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Check if response has error
    if ('error' in data) {
      throw new Error((data as ErrorResponse).error);
    }

    return data as GenerateAddressResponse;
  } catch (error) {
    console.error('Failed to generate deposit address:', error);
    throw error;
  }
}

/**
 * Operation from /operations endpoint
 */
export interface Operation {
  id: string;
  type: string;
  status: string;
  amount: string;
  asset: string;
  srcChain: string;
  dstChain: string;
  srcTxHash?: string;
  dstTxHash?: string;
  timestamp: number;
}

/**
 * Get operations for a Hyperliquid address
 *
 * @param address - Hyperliquid address
 * @returns List of operations
 */
export async function getOperations(address: string): Promise<Operation[]> {
  const url = `${BASE_URL}/operations/${address}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get operations:', error);
    throw error;
  }
}
