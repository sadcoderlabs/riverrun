import { UnitChainType } from '@/lib/riverrun/transfer-fund/constants/deposit-tokens';

/**
 * Unit Protocol API Base URL
 * Mainnet: https://api.hyperunit.xyz
 * Testnet: https://api.hyperunit-testnet.xyz
 */
const UNIT_API_BASE_URL = 'https://api.hyperunit.xyz';

/**
 * Chain fee estimation data from Unit Protocol
 */
export interface ChainFeeEstimate {
  depositEta: string; // e.g., "21m", "3m", "1m"
  depositFee: number;
  withdrawalEta: string;
  withdrawalFee: number;
  [key: string]: any; // Additional chain-specific fields
}

/**
 * Response from /v2/estimate-fees endpoint
 */
export interface EstimateFeesResponse {
  bitcoin?: ChainFeeEstimate;
  ethereum?: ChainFeeEstimate;
  plasma?: ChainFeeEstimate;
  solana?: ChainFeeEstimate;
  spl?: ChainFeeEstimate;
}

/**
 * Fetch fee estimates from Unit Protocol
 *
 * @returns Promise with fee estimation data for all chains
 * @throws Error if the API request fails
 */
export async function fetchEstimateFees(): Promise<EstimateFeesResponse> {
  try {
    const response = await fetch(`${UNIT_API_BASE_URL}/v2/estimate-fees`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch estimate fees: ${response.status} ${response.statusText}`);
    }

    const data: EstimateFeesResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching estimate fees:', error);
    throw error;
  }
}

/**
 * Get deposit ETA for a specific chain type
 *
 * @param chainType - The chain type to get ETA for
 * @param estimates - The estimate fees response data
 * @returns Deposit ETA string or undefined if not available
 */
export function getDepositEta(
  chainType: UnitChainType,
  estimates: EstimateFeesResponse,
): string | undefined {
  return estimates[chainType]?.depositEta;
}
