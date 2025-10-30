import { useEffect, useMemo, useState } from 'react';
import { DEPOSIT_TOKENS, DepositToken } from '../constants/deposit-tokens';
import {
  EstimateFeesResponse,
  fetchEstimateFees,
  getDepositEta,
} from '../services/unit-protocol-api';

/**
 * Hook for managing deposit token list and search functionality
 *
 * Provides filtered token list based on search query and token selection handler
 * Fetches real-time estimation times from Unit Protocol API
 */
export function useDepositTokens() {
  const [searchQuery, setSearchQuery] = useState('');
  const [estimates, setEstimates] = useState<EstimateFeesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch estimation fees on mount
  useEffect(() => {
    async function loadEstimates() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchEstimateFees();
        setEstimates(data);
      } catch (err) {
        console.error('Failed to load estimate fees:', err);
        setError('Failed to load estimation times');
      } finally {
        setIsLoading(false);
      }
    }

    loadEstimates();
  }, []);

  // Update tokens with real-time estimation times
  const tokensWithEstimates = useMemo(() => {
    if (!estimates) {
      return DEPOSIT_TOKENS;
    }

    return DEPOSIT_TOKENS.map(token => {
      const depositEta = getDepositEta(token.chainType, estimates);
      return {
        ...token,
        estimatedTime: depositEta || token.estimatedTime, // Fallback to default if API doesn't return data
      };
    });
  }, [estimates]);

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) {
      return tokensWithEstimates;
    }

    const query = searchQuery.toLowerCase();
    return tokensWithEstimates.filter(
      token =>
        token.symbol.toLowerCase().includes(query) || token.fullName.toLowerCase().includes(query),
    );
  }, [searchQuery, tokensWithEstimates]);

  /**
   * Handle token selection
   * This will be used to navigate to Unit Protocol or initiate deposit flow
   */
  const selectToken = (token: DepositToken) => {
    // TODO: Implement Unit Protocol integration
    console.log('Selected token:', token.symbol);
  };

  return {
    tokens: filteredTokens,
    searchQuery,
    setSearchQuery,
    selectToken,
    isLoading,
    error,
  };
}
