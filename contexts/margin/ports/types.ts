/**
 * Margin Domain Types
 *
 * Core domain types for the Margin context.
 */

/**
 * Margin and leverage settings for a trading position
 */
export interface MarginLeverage {
  /** Current leverage value (e.g., 5, 10, 20) */
  leverage: number;
  /** Margin mode: isolated or cross */
  marginMode: 'isolated' | 'cross';
  /** Minimum leverage allowed (always 1) */
  minLeverage: number;
  /** Maximum leverage allowed for this market */
  maxLeverage: number;
}

/**
 * Parameters for updating margin and leverage settings
 */
export interface SetMarginLeverageParams {
  /** New leverage value */
  leverage: number;
  /** Margin mode */
  marginMode: 'isolated' | 'cross';
}

/**
 * Command for setting margin leverage
 *
 * UseCase pattern: All parameters passed through Command object
 */
export type SetMarginLeverageCommand = {
  /** Agent wallet for executing the operation */
  agentWallet: {
    address: string;
    signer: any;
  };
  /** Market coin symbol */
  coin: string;
  /** Asset ID on the exchange */
  assetId: number;
  /** New leverage value */
  leverage: number;
  /** Margin mode */
  marginMode: 'isolated' | 'cross';
};
