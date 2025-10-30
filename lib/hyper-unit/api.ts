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
 * Supported destination chains (for withdrawals)
 */
export type DestinationChain = 'bitcoin' | 'ethereum' | 'solana';

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
 * Minimum withdrawal amounts (same as deposit)
 */
export const MIN_WITHDRAWAL_AMOUNTS = {
  btc: 0.002,
  eth: 0.05,
  sol: 0.2,
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
 * Generate a Unit Protocol withdrawal address
 *
 * This generates a Hyperliquid address that, when sent tokens via spotSend,
 * will forward those tokens to the destination chain address.
 *
 * @param dstChain - Destination chain (bitcoin, ethereum, solana)
 * @param asset - Asset symbol (btc, eth, sol)
 * @param dstAddr - Destination address on the target chain (e.g., Ethereum address)
 * @returns Generated Hyperliquid withdrawal address
 */
export async function generateWithdrawalAddress(
  dstChain: DestinationChain,
  asset: Asset,
  dstAddr: string,
): Promise<GenerateAddressResponse> {
  const url = `${BASE_URL}/gen/hyperliquid/${dstChain}/${asset}/${dstAddr}`;

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
    console.error('Failed to generate withdrawal address:', error);
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

/**
 * Chain fee estimation data
 */
export interface ChainFeeEstimate {
  depositEta: string;
  depositFee: number;
  withdrawalEta: string;
  withdrawalFee: number;
}

/**
 * Response from /v2/estimate-fees endpoint
 */
export interface EstimateFeesResponse {
  bitcoin: ChainFeeEstimate & {
    'deposit-fee-rate-sats-per-vb': number;
    'deposit-size-v-bytes': number;
    'withdrawal-fee-rate-sats-per-vb': number;
    'withdrawal-size-v-bytes': number;
  };
  ethereum: ChainFeeEstimate & {
    'base-fee': number;
    'eth-deposit-gas': number;
    'eth-withdrawal-gas': number;
    'priority-fee': number;
  };
  solana: ChainFeeEstimate;
  spl: ChainFeeEstimate;
}

/**
 * Fetch current fee rates and expected processing times
 *
 * @returns Fee estimates for all supported chains
 */
export async function fetchEstimateFees(): Promise<EstimateFeesResponse> {
  const url = `${BASE_URL}/v2/estimate-fees`;

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
    console.error('Failed to fetch estimate fees:', error);
    throw error;
  }
}

/**
 * Get deposit ETA for a specific chain
 *
 * @param chain - Chain name (bitcoin, ethereum, solana)
 * @param estimates - Estimate fees response
 * @returns Deposit ETA string (e.g., "21m", "3m")
 */
export function getDepositEta(chain: SourceChain, estimates: EstimateFeesResponse): string | null {
  const chainData = estimates[chain];
  return chainData?.depositEta || null;
}

/**
 * Get withdrawal ETA for a specific chain
 *
 * @param chain - Chain name (bitcoin, ethereum, solana)
 * @param estimates - Estimate fees response
 * @returns Withdrawal ETA string (e.g., "21m", "7m")
 */
export function getWithdrawalEta(
  chain: DestinationChain,
  estimates: EstimateFeesResponse,
): string | null {
  const chainData = estimates[chain];
  return chainData?.withdrawalEta || null;
}
