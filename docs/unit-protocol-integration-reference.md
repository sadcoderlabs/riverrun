# Unit Protocol Integration Reference

**Last Updated:** 2025-10-31
**Status:** Archived - Integration Removed
**Purpose:** Reference documentation for future re-implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Integration](#api-integration)
4. [React Hooks Implementation](#react-hooks-implementation)
5. [UI Components](#ui-components)
6. [Configuration](#configuration)
7. [Re-implementation Guide](#re-implementation-guide)

---

## Overview

### What is Unit Protocol?

Unit Protocol (HyperUnit) is a cross-chain bridge service that enables deposits and withdrawals of spot tokens (BTC, ETH, SOL) to/from Hyperliquid. It acts as an intermediary that forwards tokens between different blockchain networks and Hyperliquid's trading platform.

### Key Features

- **Deposits:** Generate permanent deposit addresses on source chains (Bitcoin, Ethereum, Solana) that automatically forward tokens to a Hyperliquid address
- **Withdrawals:** Generate temporary Hyperliquid addresses that, when sent tokens via `spotSend`, forward them to destination addresses on target chains
- **Fee Estimation:** Real-time fee rates and estimated processing times (ETAs)
- **No Authentication Required:** Public API with no API keys needed

### Official Documentation

- **API Docs:** https://docs.hyperunit.xyz/developers/api
- **MCP Server:** https://docs.hyperunit.xyz/~gitbook/mcp
- **Mainnet API:** https://api.hyperunit.xyz
- **Testnet API:** https://api.hyperunit-testnet.xyz

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        DEPOSITS                              │
└─────────────────────────────────────────────────────────────┘

User selects BTC/ETH/SOL
        ↓
Generate deposit address via Unit Protocol API
GET /gen/{srcChain}/hyperliquid/{asset}/{hyperliquidAddress}
        ↓
Display permanent deposit address to user
        ↓
User sends tokens from external wallet
        ↓
Unit Protocol detects deposit → forwards to Hyperliquid
        ↓
Tokens appear in user's Hyperliquid spot balance


┌─────────────────────────────────────────────────────────────┐
│                       WITHDRAWALS                            │
└─────────────────────────────────────────────────────────────┘

User enters destination address (BTC/ETH/SOL address)
        ↓
Generate withdrawal address via Unit Protocol API
GET /gen/hyperliquid/{dstChain}/{asset}/{destinationAddress}
        ↓
Returns temporary Hyperliquid intermediary address
        ↓
User executes spotSend(intermediaryAddress, token, amount)
        ↓
Unit Protocol detects transfer → forwards to destination address
        ↓
Tokens arrive in user's external wallet
```

### Supported Chains & Assets

| Asset | Symbol | Source Chain (Deposits) | Destination Chain (Withdrawals) | Hyperliquid Spot Token |
|-------|--------|-------------------------|--------------------------------|------------------------|
| Bitcoin | BTC | bitcoin | bitcoin | UBTC |
| Ethereum | ETH | ethereum | ethereum | UETH |
| Solana | SOL | solana | solana | USOL |

### Minimum Amounts

| Asset | Min Deposit | Min Withdrawal |
|-------|-------------|----------------|
| BTC | 0.002 | 0.002 |
| ETH | 0.05 | 0.05 |
| SOL | 0.1 | 0.2 |

### Typical Processing Times

| Chain | Deposit ETA | Withdrawal ETA |
|-------|-------------|----------------|
| Bitcoin | ~21 minutes | ~21 minutes |
| Ethereum | ~3 minutes | ~7 minutes |
| Solana | ~1 minute | ~1 minute |

*Note: ETAs are fetched in real-time from `/v2/estimate-fees` endpoint*

---

## API Integration

### Base Configuration

```typescript
// Base URLs
const UNIT_API_BASE_URL = 'https://api.hyperunit.xyz';
const UNIT_TESTNET_API_BASE_URL = 'https://api.hyperunit-testnet.xyz';

// TypeScript types
type SourceChain = 'bitcoin' | 'ethereum' | 'solana';
type DestinationChain = 'bitcoin' | 'ethereum' | 'solana';
type Asset = 'btc' | 'eth' | 'sol';
```

### 1. Generate Deposit Address

**Endpoint:**
```
GET /gen/{srcChain}/hyperliquid/{asset}/{dstAddr}
```

**Parameters:**
- `srcChain`: Source chain (bitcoin | ethereum | solana)
- `asset`: Asset symbol (btc | eth | sol)
- `dstAddr`: User's Hyperliquid wallet address (0x...)

**Example Request:**
```typescript
const url = 'https://api.hyperunit.xyz/gen/bitcoin/hyperliquid/btc/0xUSER_HYPERLIQUID_ADDRESS';

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

**Example Response:**
```json
{
  "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "signatures": {
    "field-node": "0x1234...",
    "hl-node": "0x5678...",
    "node-1": "0x9abc..."
  },
  "status": "OK"
}
```

**Key Points:**
- The `address` field is the deposit address on the source chain
- This address is **permanent** and deterministic (same address for same inputs)
- Users can reuse this address for multiple deposits
- No expiration time

**Implementation:**
```typescript
export interface GenerateAddressResponse {
  address: string;
  signatures: {
    'field-node': string;
    'hl-node': string;
    'node-1': string;
  };
  status: string;
}

export async function generateDepositAddress(
  srcChain: SourceChain,
  asset: Asset,
  dstAddr: string,
): Promise<GenerateAddressResponse> {
  const url = `${BASE_URL}/gen/${srcChain}/hyperliquid/${asset}/${dstAddr}`;

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

  if ('error' in data) {
    throw new Error(data.error);
  }

  return data;
}
```

---

### 2. Generate Withdrawal Address

**Endpoint:**
```
GET /gen/hyperliquid/{dstChain}/{asset}/{dstAddr}
```

**Parameters:**
- `dstChain`: Destination chain (bitcoin | ethereum | solana)
- `asset`: Asset symbol (btc | eth | sol)
- `dstAddr`: Destination address on target chain (e.g., user's Ethereum address: 0x...)

**Example Request:**
```typescript
const url = 'https://api.hyperunit.xyz/gen/hyperliquid/ethereum/eth/0xUSER_ETHEREUM_ADDRESS';

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

**Example Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signatures": {
    "field-node": "0x1234...",
    "hl-node": "0x5678...",
    "node-1": "0x9abc..."
  },
  "status": "OK"
}
```

**Key Points:**
- The `address` field is a **Hyperliquid address** (not a destination chain address)
- This is an intermediary address controlled by Unit Protocol
- User must send tokens to this address using Hyperliquid's `spotSend` API
- Unit Protocol will then forward the tokens to the final destination address
- Address is tied to the specific destination address provided

**Implementation:**
```typescript
export async function generateWithdrawalAddress(
  dstChain: DestinationChain,
  asset: Asset,
  dstAddr: string,
): Promise<GenerateAddressResponse> {
  const url = `${BASE_URL}/gen/hyperliquid/${dstChain}/${asset}/${dstAddr}`;

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

  if ('error' in data) {
    throw new Error(data.error);
  }

  return data;
}
```

**Withdrawal Flow with Hyperliquid spotSend:**
```typescript
// 1. User enters destination address (validated)
const destinationAddress = '0xUSER_ETHEREUM_ADDRESS';

// 2. Generate withdrawal address
const withdrawalResponse = await generateWithdrawalAddress('ethereum', 'eth', destinationAddress);
const unitAddress = withdrawalResponse.address; // Hyperliquid address

// 3. Execute spotSend to Unit Protocol address
// This requires Hyperliquid SDK/API integration
const tokenIdentifier = 'UETH:TOKEN_ID'; // Format: "NAME:TOKEN_ID"
await spotSend(unitAddress, tokenIdentifier, amount);

// 4. Unit Protocol detects the transfer and forwards to destination
```

---

### 3. Estimate Fees & ETAs

**Endpoint:**
```
GET /v2/estimate-fees
```

**No parameters required**

**Example Request:**
```typescript
const url = 'https://api.hyperunit.xyz/v2/estimate-fees';

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

**Example Response:**
```json
{
  "bitcoin": {
    "depositEta": "21m",
    "depositFee": 0.00015,
    "withdrawalEta": "21m",
    "withdrawalFee": 0.00015,
    "deposit-fee-rate-sats-per-vb": 50,
    "deposit-size-v-bytes": 300,
    "withdrawal-fee-rate-sats-per-vb": 50,
    "withdrawal-size-v-bytes": 300
  },
  "ethereum": {
    "depositEta": "3m",
    "depositFee": 0.002,
    "withdrawalEta": "7m",
    "withdrawalFee": 0.003,
    "base-fee": 15000000000,
    "eth-deposit-gas": 100000,
    "eth-withdrawal-gas": 150000,
    "priority-fee": 2000000000
  },
  "solana": {
    "depositEta": "1m",
    "depositFee": 0.000005,
    "withdrawalEta": "1m",
    "withdrawalFee": 0.000005
  },
  "plasma": {
    "depositEta": "3m",
    "depositFee": 0.001,
    "withdrawalEta": "5m",
    "withdrawalFee": 0.002
  },
  "spl": {
    "depositEta": "1m",
    "depositFee": 0.000005,
    "withdrawalEta": "1m",
    "withdrawalFee": 0.000005
  }
}
```

**TypeScript Interface:**
```typescript
export interface ChainFeeEstimate {
  depositEta: string;      // e.g., "21m", "3m", "1m"
  depositFee: number;      // Fee in native token units
  withdrawalEta: string;
  withdrawalFee: number;
}

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
  plasma?: ChainFeeEstimate;
  spl?: ChainFeeEstimate;
}
```

**Implementation:**
```typescript
export async function fetchEstimateFees(): Promise<EstimateFeesResponse> {
  const url = `${BASE_URL}/v2/estimate-fees`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Helper functions
export function getDepositEta(chain: SourceChain, estimates: EstimateFeesResponse): string | null {
  return estimates[chain]?.depositEta || null;
}

export function getWithdrawalEta(chain: DestinationChain, estimates: EstimateFeesResponse): string | null {
  return estimates[chain]?.withdrawalEta || null;
}
```

---

### 4. Get Operations History (Optional)

**Endpoint:**
```
GET /operations/{address}
```

**Parameters:**
- `address`: Hyperliquid wallet address

**Example Request:**
```typescript
const url = 'https://api.hyperunit.xyz/operations/0xUSER_HYPERLIQUID_ADDRESS';

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

**Example Response:**
```json
[
  {
    "id": "op_12345",
    "type": "deposit",
    "status": "completed",
    "amount": "0.05",
    "asset": "eth",
    "srcChain": "ethereum",
    "dstChain": "hyperliquid",
    "srcTxHash": "0xabc...",
    "dstTxHash": "0xdef...",
    "timestamp": 1698765432000
  }
]
```

**TypeScript Interface:**
```typescript
export interface Operation {
  id: string;
  type: string;           // "deposit" | "withdrawal"
  status: string;         // "pending" | "completed" | "failed"
  amount: string;
  asset: string;
  srcChain: string;
  dstChain: string;
  srcTxHash?: string;
  dstTxHash?: string;
  timestamp: number;
}
```

**Note:** This endpoint was implemented in the API layer but **not used in the UI**. Consider adding a transaction history page if re-implementing.

---

## React Hooks Implementation

### 1. useUnitDepositAddress Hook

**Purpose:** Generate and manage deposit addresses for the user's Hyperliquid wallet.

**File Structure:**
```
lib/hyper-unit/hooks/useUnitDepositAddress.ts
```

**Implementation:**
```typescript
import { useEffect, useState, useCallback } from 'react';
import { useActiveWallet } from '@/lib/riverrun/hooks';
import {
  generateDepositAddress,
  type SourceChain,
  type Asset,
  type GenerateAddressResponse,
} from '../api';

export interface UseUnitDepositAddressResult {
  address: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUnitDepositAddress(
  srcChain: SourceChain,
  asset: Asset,
): UseUnitDepositAddressResult {
  const { address: hyperliquidAddress, isAuthenticated } = useActiveWallet();
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddress = useCallback(async () => {
    if (!hyperliquidAddress || !isAuthenticated) {
      setAddress(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await generateDepositAddress(srcChain, asset, hyperliquidAddress);

      if (response.status === 'OK' && response.address) {
        setAddress(response.address);
      } else {
        throw new Error('Failed to generate deposit address');
      }
    } catch (err) {
      console.error('Failed to fetch deposit address:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate address');
      setAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, [srcChain, asset, hyperliquidAddress, isAuthenticated]);

  // Fetch address on mount and when dependencies change
  useEffect(() => {
    fetchAddress();
  }, [fetchAddress]);

  return {
    address,
    isLoading,
    error,
    refetch: fetchAddress,
  };
}
```

**Usage Example:**
```typescript
// In a deposit page component
const { address, isLoading, error } = useUnitDepositAddress('bitcoin', 'btc');

if (isLoading) return <Spinner />;
if (error) return <Text>Error: {error}</Text>;
if (address) return <Text>Deposit to: {address}</Text>;
```

---

### 2. useUnitWithdrawalAddress Hook

**Purpose:** Generate withdrawal addresses dynamically based on user input.

**File Structure:**
```
lib/hyper-unit/hooks/useUnitWithdrawalAddress.ts
```

**Implementation:**
```typescript
import { useEffect, useState } from 'react';
import { generateWithdrawalAddress, type DestinationChain, type Asset } from '../api';

interface UseUnitWithdrawalAddressResult {
  address: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useUnitWithdrawalAddress(
  dstChain: DestinationChain | null,
  asset: Asset | null,
  dstAddr: string | null,
): UseUnitWithdrawalAddressResult {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only proceed if all parameters are provided
    if (!dstChain || !asset || !dstAddr) {
      setAddress(null);
      setError(null);
      return;
    }

    const fetchWithdrawalAddress = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await generateWithdrawalAddress(dstChain, asset, dstAddr);

        if (response.status === 'OK' && response.address) {
          setAddress(response.address);
        } else {
          setError('Failed to generate withdrawal address');
          setAddress(null);
        }
      } catch (err) {
        console.error('Error generating withdrawal address:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWithdrawalAddress();
  }, [dstChain, asset, dstAddr]);

  return {
    address,
    isLoading,
    error,
  };
}
```

**Usage Example:**
```typescript
// In a withdrawal page component
const [recipientAddress, setRecipientAddress] = useState('');
const isValidAddress = validateAddress(recipientAddress); // Custom validation

const {
  address: unitAddress,
  isLoading,
  error
} = useUnitWithdrawalAddress(
  isValidAddress ? 'ethereum' : null,
  isValidAddress ? 'eth' : null,
  isValidAddress ? recipientAddress : null,
);

// Use unitAddress in spotSend call
```

---

### 3. useEstimateFees Hook

**Purpose:** Fetch and manage fee estimates and ETAs for all chains.

**File Structure:**
```
lib/hyper-unit/hooks/useEstimateFees.ts
```

**Implementation:**
```typescript
import { useEffect, useState, useCallback } from 'react';
import {
  fetchEstimateFees,
  getDepositEta,
  getWithdrawalEta,
  type EstimateFeesResponse,
  type SourceChain,
  type DestinationChain,
} from '../api';

export interface UseEstimateFeesResult {
  estimates: EstimateFeesResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getDepositEtaForChain: (chain: SourceChain) => string | null;
  getWithdrawalEtaForChain: (chain: DestinationChain) => string | null;
}

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

  const getDepositEtaForChain = useCallback(
    (chain: SourceChain): string | null => {
      if (!estimates) return null;
      return getDepositEta(chain, estimates);
    },
    [estimates],
  );

  const getWithdrawalEtaForChain = useCallback(
    (chain: DestinationChain): string | null => {
      if (!estimates) return null;
      return getWithdrawalEta(chain, estimates);
    },
    [estimates],
  );

  return {
    estimates,
    isLoading,
    error,
    refetch: fetchData,
    getDepositEtaForChain,
    getWithdrawalEtaForChain,
  };
}
```

**Usage Example:**
```typescript
// In deposit token list
const { getDepositEtaForChain, isLoading } = useEstimateFees();

const btcEta = getDepositEtaForChain('bitcoin'); // "21m"
const ethEta = getDepositEtaForChain('ethereum'); // "3m"
```

---

## UI Components

### 1. Deposit Page (deposit-unit-bridge.tsx)

**Route:** `/(main)/deposit/deposit-unit-bridge`

**URL Parameters:**
- `symbol`: Token symbol (BTC | ETH | SOL)
- `chain`: Chain name (bitcoin | ethereum | solana)

**Key Features:**
```typescript
// URL params
const params = useLocalSearchParams<{ symbol: string; chain: string }>();

// Generate deposit address
const { address, isLoading, error } = useUnitDepositAddress(
  chainInfo.unitChainType as SourceChain,
  token.symbol.toLowerCase() as Asset,
);

// Get ETA
const { getDepositEtaForChain } = useEstimateFees();
const depositEta = getDepositEtaForChain(chainInfo.unitChainType as SourceChain);
```

**UI Elements:**
1. **Token Display:** Icon + full name
2. **Instructions:** "Use the address below to receive {token} to your exchange account"
3. **ETA Display:** "Est. completion time: {depositEta}"
4. **Minimum Warning:** Alert box with minimum deposit amount
5. **Deposit Address:** Read-only text box with monospace font
6. **Copy Button:** Copies address to clipboard with toast feedback
7. **Important Warning:** Loss of funds warning for amounts below minimum

**Address Validation:**
- None required (display-only)
- Show loading state while generating
- Handle errors gracefully

---

### 2. Withdrawal Page (withdraw-unit-bridge.tsx)

**Route:** `/(main)/withdraw/withdraw-unit-bridge`

**URL Parameters:**
- `symbol`: Token symbol (BTC | ETH | SOL)
- `chain`: Chain name (bitcoin | ethereum | solana)

**Key Features:**
```typescript
// Token configuration
const TOKEN_INFO = {
  ETH: {
    network: 'ethereum',
    minWithdrawal: 0.05,
    spotTokenName: 'UETH',
  },
  BTC: {
    network: 'bitcoin',
    minWithdrawal: 0.002,
    spotTokenName: 'UBTC',
  },
  SOL: {
    network: 'solana',
    minWithdrawal: 0.2,
    spotTokenName: 'USOL',
  },
};

// Get spot balance
const { balance, tokenInfo, refreshBalance } = useSpotBalance(tokenInfo.spotTokenName);

// Generate withdrawal address
const { address: unitWithdrawalAddress, isLoading, error } = useUnitWithdrawalAddress(
  isRecipientValid ? tokenInfo.network as DestinationChain : null,
  isRecipientValid ? params.symbol?.toLowerCase() as Asset : null,
  isRecipientValid ? recipientAddress : null,
);

// Execute withdrawal
const { send: spotSend, isSending } = useSpotSend();
const tokenIdentifier = `${spotTokenInfo.name}:${spotTokenInfo.tokenId}`;
await spotSend(unitWithdrawalAddress, tokenIdentifier, amount);
```

**Address Validation:**
```typescript
function isValidAddress(address: string, network: string): boolean {
  if (network === 'ethereum') {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } else if (network === 'bitcoin') {
    return /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
  } else if (network === 'solana') {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }
  return false;
}
```

**UI Elements:**
1. **Recipient Address Input:**
   - Input field with paste button
   - Real-time validation with error messages
   - Loading state while generating Unit address
2. **Balance Display:** Current spot balance with spinner during load
3. **Amount Input:**
   - Decimal input with MAX button
   - Minimum amount validation
   - Insufficient balance detection
4. **Withdrawal Button:**
   - Disabled until valid address + amount
   - Shows spinner during processing
5. **Info Box:** Network costs disclaimer + ETA
6. **Warning:** Irreversible transaction warning

---

### 3. Token List Integration

**Deposit Token Configuration:**
```typescript
// lib/riverrun/transfer-fund/constants/deposit-tokens.ts
export const DEPOSIT_TOKENS = [
  {
    symbol: 'BTC',
    fullName: 'Bitcoin',
    icon: '₿',
    supportChains: [
      {
        chain: 'bitcoin' as ChainName,
        depositMethod: 'unit-protocol' as const,
      },
    ],
  },
  {
    symbol: 'ETH',
    fullName: 'Ethereum',
    icon: 'Ξ',
    supportChains: [
      {
        chain: 'ethereum' as ChainName,
        depositMethod: 'unit-protocol' as const,
      },
    ],
  },
  {
    symbol: 'SOL',
    fullName: 'Solana',
    icon: '◎',
    supportChains: [
      {
        chain: 'solana' as ChainName,
        depositMethod: 'unit-protocol' as const,
      },
    ],
  },
];

export const CHAINS = {
  bitcoin: {
    name: 'bitcoin' as const,
    displayName: 'Bitcoin',
    icon: '₿',
    unitChainType: 'bitcoin' as UnitChainType,
  },
  ethereum: {
    name: 'ethereum' as const,
    displayName: 'Ethereum',
    icon: 'Ξ',
    unitChainType: 'ethereum' as UnitChainType,
  },
  solana: {
    name: 'solana' as const,
    displayName: 'Solana',
    icon: '◎',
    unitChainType: 'solana' as UnitChainType,
  },
};
```

**Routing Logic:**
```typescript
// In select-source-chain.tsx
if (selectedChain.depositMethod === 'unit-protocol') {
  router.push({
    pathname: '/(main)/deposit/deposit-unit-bridge',
    params: { symbol: token.symbol, chain: selectedChain.chain },
  });
}
```

**Withdraw Token List:**
```typescript
// app/(main)/withdraw/withdraw-tokens.tsx
const WITHDRAW_TOKENS = [
  {
    symbol: 'ETH',
    fullName: 'Ethereum',
    icon: 'Ξ',
    network: 'ethereum',
    route: '/(main)/withdraw/withdraw-unit-bridge',
  },
  {
    symbol: 'BTC',
    fullName: 'Bitcoin',
    icon: '₿',
    network: 'bitcoin',
    route: '/(main)/withdraw/withdraw-unit-bridge',
  },
  {
    symbol: 'SOL',
    fullName: 'Solana',
    icon: '◎',
    network: 'solana',
    route: '/(main)/withdraw/withdraw-unit-bridge',
  },
  {
    symbol: 'USDC',
    fullName: 'USD Coin',
    icon: '💵',
    network: 'arbitrum',
    route: '/(main)/withdraw/withdraw-hl-bridge', // DIFFERENT!
  },
];
```

---

## Configuration

### TypeScript Types

```typescript
// Chain and asset types
export type SourceChain = 'bitcoin' | 'ethereum' | 'solana';
export type DestinationChain = 'bitcoin' | 'ethereum' | 'solana';
export type Asset = 'btc' | 'eth' | 'sol';
export type UnitChainType = 'bitcoin' | 'ethereum' | 'plasma' | 'solana' | 'spl';

// Constants
export const MIN_DEPOSIT_AMOUNTS = {
  btc: 0.002,
  eth: 0.05,
  sol: 0.1,
} as const;

export const MIN_WITHDRAWAL_AMOUNTS = {
  btc: 0.002,
  eth: 0.05,
  sol: 0.2,
} as const;
```

### MCP Server Configuration

```json
// .mcp.json
{
  "mcpServers": {
    "unit-gitbook": {
      "type": "http",
      "url": "https://docs.hyperunit.xyz/~gitbook/mcp"
    }
  }
}
```

### Hyperliquid Spot Token Mapping

| Asset | Hyperliquid Spot Token Name |
|-------|---------------------------|
| BTC | UBTC |
| ETH | UETH |
| SOL | USOL |

**Important:** Use the correct token name when calling `useSpotBalance` and `spotSend`:
```typescript
const { balance } = useSpotBalance('UETH'); // Not just 'ETH'
const tokenIdentifier = `${spotTokenInfo.name}:${spotTokenInfo.tokenId}`;
await spotSend(address, tokenIdentifier, amount);
```

---

## Re-implementation Guide

### Prerequisites

1. **Hyperliquid Integration:**
   - `useActiveWallet()` hook for user address
   - `useSpotBalance(tokenName)` hook for reading balances
   - `useSpotSend()` hook for sending spot tokens
   - Access to spot token metadata (name, tokenId)

2. **UI Framework:**
   - React Native with Expo Router
   - Tamagui for UI components
   - Clipboard access (expo-clipboard)
   - Toast notifications (sonner-native)

### Step-by-Step Implementation

#### Phase 1: Set Up Core API Layer

1. **Create API module** (`lib/hyper-unit/api.ts`):
   ```typescript
   - Define types (SourceChain, DestinationChain, Asset)
   - Implement generateDepositAddress()
   - Implement generateWithdrawalAddress()
   - Implement fetchEstimateFees()
   - Add helper functions (getDepositEta, getWithdrawalEta)
   ```

2. **Test API functions independently:**
   ```bash
   # Test in a simple script or REPL
   const address = await generateDepositAddress('bitcoin', 'btc', '0xYOUR_ADDRESS');
   console.log(address);
   ```

#### Phase 2: Create React Hooks

3. **Create `useUnitDepositAddress` hook:**
   - Auto-fetch on mount
   - Handle loading/error states
   - Provide refetch function
   - Test with console logs

4. **Create `useUnitWithdrawalAddress` hook:**
   - Fetch only when all params provided
   - React to param changes
   - Clear state when params become invalid

5. **Create `useEstimateFees` hook:**
   - Fetch on mount
   - Provide helper functions for chain-specific ETAs
   - Cache results

#### Phase 3: Configure Token System

6. **Update `deposit-tokens.ts`:**
   ```typescript
   - Add BTC, ETH, SOL to DEPOSIT_TOKENS
   - Set depositMethod: 'unit-protocol'
   - Add chains to CHAINS config with unitChainType
   ```

7. **Update withdraw token list:**
   ```typescript
   - Add entries with route: '/(main)/withdraw/withdraw-unit-bridge'
   - Include network and minWithdrawal config
   ```

#### Phase 4: Build UI Pages

8. **Create deposit page** (`deposit-unit-bridge.tsx`):
   - Parse URL params
   - Use `useUnitDepositAddress` hook
   - Display address with copy functionality
   - Show minimum amount warnings
   - Add ETA display

9. **Create withdrawal page** (`withdraw-unit-bridge.tsx`):
   - Add recipient address input with validation
   - Use `useSpotBalance` for balance display
   - Use `useUnitWithdrawalAddress` for address generation
   - Implement amount input with validation
   - Connect to `spotSend` for execution
   - Show ETA and fee warnings

#### Phase 5: Wire Up Routing

10. **Update `select-source-chain.tsx`:**
    ```typescript
    if (depositMethod === 'unit-protocol') {
      router.push({
        pathname: '/(main)/deposit/deposit-unit-bridge',
        params: { symbol, chain },
      });
    }
    ```

11. **Update `withdraw-tokens.tsx`:**
    ```typescript
    const handleTokenPress = (token) => {
      router.push({
        pathname: token.route,
        params: { symbol: token.symbol, chain: token.network },
      });
    };
    ```

#### Phase 6: Testing

12. **Test deposit flow:**
    - Select BTC/ETH/SOL from deposit list
    - Verify address generation
    - Test copy functionality
    - Verify warnings display correctly

13. **Test withdrawal flow:**
    - Enter valid/invalid addresses
    - Verify validation messages
    - Test MAX button
    - Execute small test withdrawal
    - Monitor transaction on Hyperliquid

14. **Test edge cases:**
    - Disconnect wallet mid-flow
    - Network errors
    - Invalid API responses
    - Amounts below minimum
    - Insufficient balance

#### Phase 7: Documentation & MCP

15. **Add MCP server** (optional):
    ```json
    {
      "mcpServers": {
        "unit-gitbook": {
          "type": "http",
          "url": "https://docs.hyperunit.xyz/~gitbook/mcp"
        }
      }
    }
    ```

16. **Document for team:**
    - API endpoints and rate limits
    - Minimum amounts and fees
    - Common error scenarios
    - Support contact information

---

### Common Gotchas

1. **Withdrawal Address != Destination Address:**
   - The Unit Protocol API returns a Hyperliquid address
   - You must use `spotSend` to this address
   - Unit Protocol then forwards to the final destination

2. **Token Name Mapping:**
   - Use 'UETH', 'UBTC', 'USOL' for Hyperliquid spot tokens
   - Not just 'ETH', 'BTC', 'SOL'

3. **Address Validation:**
   - Validate before calling Unit API (saves rate limit)
   - Bitcoin addresses: starts with 1, 3, or bc1
   - Ethereum addresses: 0x + 40 hex chars
   - Solana addresses: base58, 32-44 chars

4. **Minimum Amounts:**
   - Strictly enforce on UI (disable button)
   - Show clear warning messages
   - Different minimums for deposit vs withdrawal (SOL: 0.1 vs 0.2)

5. **ETAs Are Estimates:**
   - Display as "Est. completion time"
   - Don't guarantee exact timing
   - Fetch real-time from API

6. **Error Handling:**
   - Unit Protocol API may be down
   - Network requests can fail
   - Handle gracefully with retry options

---

## Performance Considerations

1. **API Calls:**
   - Deposit addresses are permanent (cache them)
   - Withdrawal addresses are tied to destination (cache per recipient)
   - Fee estimates change frequently (refetch on page load)

2. **Hook Dependencies:**
   - Use `useCallback` to prevent unnecessary re-fetches
   - Only trigger address generation when params are valid

3. **UI Responsiveness:**
   - Show loading states immediately
   - Debounce recipient address validation
   - Disable buttons during processing

---

## Security Notes

1. **Client-Side Only:**
   - All API calls are direct from client
   - No backend proxy required
   - Unit Protocol API is public (no auth)

2. **Address Validation:**
   - Always validate user input before API calls
   - Double-check addresses in UI (show confirmation)

3. **Transaction Safety:**
   - Warn about irreversible transactions
   - Show clear minimum amount warnings
   - Display recipient address for verification

4. **No Private Keys:**
   - Unit Protocol never requires private keys
   - All signing done through Hyperliquid wallet

---

## Support & Troubleshooting

### Official Resources
- **Documentation:** https://docs.hyperunit.xyz
- **API Docs:** https://docs.hyperunit.xyz/developers/api
- **Discord/Support:** Check Unit Protocol website

### Common Issues

**Issue:** Deposit address not generating
- Check user is authenticated with Hyperliquid wallet
- Verify API endpoint is correct and accessible
- Check network connectivity

**Issue:** Withdrawal not arriving
- Verify transaction was sent to correct Unit Protocol address
- Check minimum amount was met
- Wait for full ETA period
- Contact Unit Protocol support with transaction hash

**Issue:** "Invalid address" error
- Double-check address format matches network
- Remove any whitespace from input
- Try a different destination address

---

## Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2025-10-31 | Integration removed | Focus on USDC perpetual trading only |
| 2024-XX-XX | Initial implementation | Support spot token deposits/withdrawals |

---

## Appendix: File Structure

```
lib/hyper-unit/
├── api.ts                              # Core API functions
├── unit-protocol-api.ts                # Simplified wrapper
├── unit-protocol.ts                    # Legacy service
└── hooks/
    ├── useUnitDepositAddress.ts        # Deposit address hook
    ├── useUnitWithdrawalAddress.ts     # Withdrawal address hook
    └── useEstimateFees.ts              # Fee estimation hook

app/(main)/deposit/
├── deposit-unit-bridge.tsx             # Deposit UI page
└── select-source-chain.tsx             # Chain selection (routes to deposit page)

app/(main)/withdraw/
├── withdraw-unit-bridge.tsx            # Withdrawal UI page
└── withdraw-tokens.tsx                 # Token selection (routes to withdrawal page)

lib/riverrun/transfer-fund/
├── constants/deposit-tokens.ts         # Token configuration
└── hooks/useDepositTokens.ts           # Deposit tokens with ETAs
```

---

**End of Document**

This reference provides all necessary information to re-implement Unit Protocol integration from scratch. When re-implementing, refer to this document for API patterns, hook structures, UI flows, and configuration details.
