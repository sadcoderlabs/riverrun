import { useEffect, useState, useCallback } from 'react';
import {
  fetchEstimateFees,
  getDepositEta,
  type EstimateFeesResponse,
  type SourceChain,
} from '../api';

export interface UseEstimateFeesResult {
  estimates: EstimateFeesResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getDepositEtaForChain: (chain: SourceChain) => string | null;
}

/**
 * Hook for fetching Unit Protocol fee estimates
 *
 * Provides current fee rates and expected processing times for all chains
 * Automatically fetches on mount and provides a refetch function
 *
 * @returns Fee estimates and helper functions
 */
export function useEstimateFees(): UseEstimateFeesResult {
  const [estimates, setEstimates] = useState<EstimateFeesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await fetchEstimateFees();
      setEstimates(data);
    } catch (err) {
      console.error('Failed to fetch estimate fees:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch estimates');
      setEstimates(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper function to get deposit ETA for a specific chain
  const getDepositEtaForChain = useCallback(
    (chain: SourceChain): string | null => {
      if (!estimates) return null;
      return getDepositEta(chain, estimates);
    },
    [estimates],
  );

  return {
    estimates,
    isLoading,
    error,
    refetch: fetchData,
    getDepositEtaForChain,
  };
}
