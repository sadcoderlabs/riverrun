/**
 * HyperliquidBuilderFeeAdapter
 *
 * Adapter that implements BuilderFeeExchangePort using Hyperliquid Gateway.
 * This adapter encapsulates all Hyperliquid-specific builder fee operations.
 *
 * Design Pattern: Adapter (Hexagonal Architecture)
 * - Implements the domain port interface
 * - Adapts the HyperliquidGateway to the application layer's needs
 * - Isolates external dependencies from business logic
 */

import type { Signer } from 'ethers';
import type { BuilderFeeExchangePort } from '../application/ports/BuilderFeeExchangePort';
import { HyperliquidGateway } from '../../../infra/hyperliquid/hyperliquidGateway';

export class HyperliquidBuilderFeeAdapter implements BuilderFeeExchangePort {
  constructor(private readonly gateway: HyperliquidGateway) {}

  async getMaxBuilderFee(walletAddress: string, builderAddress: string): Promise<number> {
    return await this.gateway.getMaxBuilderFee(walletAddress, builderAddress);
  }

  async approveBuilderFee(
    signer: Signer,
    maxFeeRate: string,
    builderAddress: string,
  ): Promise<void> {
    await this.gateway.approveBuilderFee(signer, maxFeeRate, builderAddress);
  }
}
