/**
 * useEnableDexAbstraction - Enable HIP-3 DEX abstraction for the account
 *
 * Provides a function to enable DEX abstraction when viewing HIP-3 assets,
 * allowing the API to return abstracted balance from main perps account.
 *
 * This is a one-time operation per account - once enabled via API, it persists.
 * The hook first checks if DEX abstraction is already enabled before calling
 * the API to avoid "Abstraction transition not allowed" errors.
 */

import { useContainer } from '@/app-internal/di';
import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';
import { useCallback, useState } from 'react';
import * as infoClient from '@/infra/hyperliquid/client/infoClient';

interface UseEnableDexAbstractionResult {
  /** Whether DEX abstraction is currently being enabled */
  isEnabling: boolean;
  /** Function to enable DEX abstraction (no-op if already enabled) */
  enable: () => Promise<void>;
}

// Track wallets we've already checked/enabled this session
const checkedWallets = new Set<string>();

/**
 * Hook to enable HIP-3 DEX abstraction
 *
 * @returns Object containing isEnabling state and enable function
 *
 * @example
 * ```typescript
 * const { isEnabling, enable } = useEnableDexAbstraction();
 *
 * useEffect(() => {
 *   if (isHip3Asset) {
 *     enable();
 *   }
 * }, [isHip3Asset, enable]);
 * ```
 */
export function useEnableDexAbstraction(): UseEnableDexAbstractionResult {
  const { wallet } = useWallet();
  const tryGetAgentWallet = useContainer(c => c.tryGetAgentWalletUseCase);
  const orderExchange = useContainer(c => c.orderExchangePort);

  const [isEnabling, setIsEnabling] = useState(false);

  const enable = useCallback(async () => {
    // Skip if no wallet or already checked this session
    if (!wallet?.address || checkedWallets.has(wallet.address)) {
      return;
    }

    setIsEnabling(true);
    try {
      // First check if DEX abstraction is already enabled
      const status = await infoClient.userDexAbstraction({
        user: wallet.address as `0x${string}`,
      });

      // Mark as checked regardless of outcome
      checkedWallets.add(wallet.address);

      // Only enable if status is null (never set before)
      // API only allows transition from null -> true
      if (status === null) {
        const { agentWallet } = await tryGetAgentWallet.execute();
        if (agentWallet) {
          await orderExchange.enableDexAbstraction(agentWallet.signer);
        }
      }
      // If status is true or false, no action needed (already set)
    } catch (error) {
      // Silent fail - user can still trade, just might see 0 balance initially
      console.warn('[useEnableDexAbstraction] Failed to enable:', error);
    } finally {
      setIsEnabling(false);
    }
  }, [wallet?.address, tryGetAgentWallet, orderExchange]);

  return { isEnabling, enable };
}
