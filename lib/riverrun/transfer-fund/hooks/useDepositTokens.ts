import { useMemo, useState } from 'react';
import { DEPOSIT_TOKENS, DepositToken } from '../constants/deposit-tokens';

/**
 * Hook for managing deposit token list and search functionality
 *
 * Provides filtered token list based on search query and token selection handler
 */
export function useDepositTokens() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) {
      return DEPOSIT_TOKENS;
    }

    const query = searchQuery.toLowerCase();
    return DEPOSIT_TOKENS.filter(
      token =>
        token.symbol.toLowerCase().includes(query) || token.fullName.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  /**
   * Handle token selection
   */
  const selectToken = (token: DepositToken) => {
    console.log('Selected token:', token.symbol);
  };

  return {
    tokens: filteredTokens,
    searchQuery,
    setSearchQuery,
    selectToken,
  };
}
