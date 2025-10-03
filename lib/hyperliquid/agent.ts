import * as hl from '@nktkas/hyperliquid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BaseWallet, BrowserProvider, Eip1193Provider, JsonRpcSigner, Wallet } from 'ethers';

export const AGENT_STORAGE_PREFIX = 'hl-agent:private-key:';
export const DEFAULT_AGENT_NAME = 'Riverrun Agent';

export async function getOrCreateAgentSigner(
  masterAddress: string,
  provider: BrowserProvider,
): Promise<BaseWallet> {
  const storageKey = `${AGENT_STORAGE_PREFIX}${masterAddress.toLowerCase()}`;

  try {
    const storedPrivateKey = await AsyncStorage.getItem(storageKey);
    if (storedPrivateKey) {
      return new Wallet(storedPrivateKey).connect(provider);
    }
  } catch (error) {
    console.error('Failed to load stored agent signer', error);
  }

  const generatedWallet = Wallet.createRandom();

  try {
    await AsyncStorage.setItem(storageKey, generatedWallet.privateKey);
  } catch (error) {
    console.error('Failed to persist generated agent signer', error);
  }

  return generatedWallet.connect(provider);
}

export async function clearAgentSigner(masterAddress: string): Promise<void> {
  const storageKey = `${AGENT_STORAGE_PREFIX}${masterAddress.toLowerCase()}`;

  try {
    await AsyncStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Failed to clear stored agent signer', error);
    throw error;
  }
}

export interface EnsureAgentApprovalOptions {
  infoClient: hl.InfoClient;
  masterAddress: string;
  agentAddress: string;
  masterExchangeClient: hl.ExchangeClient;
  agentName?: string;
}

async function checkAgentApproval({
  infoClient,
  masterAddress,
  agentAddress,
}: Pick<
  EnsureAgentApprovalOptions,
  'infoClient' | 'masterAddress' | 'agentAddress'
>): Promise<boolean> {
  const existingAgents = await infoClient.extraAgents({ user: masterAddress });

  return existingAgents.some(agent => agent.address.toLowerCase() === agentAddress.toLowerCase());
}

export async function ensureAgentApproval({
  infoClient,
  masterAddress,
  agentAddress,
  masterExchangeClient,
  agentName = DEFAULT_AGENT_NAME,
}: EnsureAgentApprovalOptions): Promise<void> {
  const approved = await checkAgentApproval({ infoClient, masterAddress, agentAddress });

  if (!approved) {
    await masterExchangeClient.approveAgent({
      agentAddress,
      agentName,
    });
  }
}

type BrowserProviderInput = ConstructorParameters<typeof BrowserProvider>[0];

export interface SetupAgentClientsOptions {
  walletProvider: Eip1193Provider;
  transport: hl.HttpTransport;
  infoClient: hl.InfoClient;
  agentName?: string;
}

export interface AgentClientContext {
  masterSigner: JsonRpcSigner;
  masterAddress: string;
  agentSigner: BaseWallet;
  agentAddress: string;
  agentExchangeClient: hl.ExchangeClient;
  masterExchangeClient: hl.ExchangeClient;
  ethersProvider: BrowserProvider;
  agentName: string;
  isAgentApproved: boolean;
}

export async function setupAgentClients({
  walletProvider,
  transport,
  infoClient,
  agentName,
}: SetupAgentClientsOptions): Promise<AgentClientContext> {
  const ethersProvider = new BrowserProvider(walletProvider as unknown as BrowserProviderInput);
  const masterSigner = await ethersProvider.getSigner();
  const masterAddress = (await masterSigner.getAddress()).toLowerCase();

  const masterExchangeClient = new hl.ExchangeClient({
    wallet: masterSigner,
    transport,
  });

  const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
  const agentAddress = await agentSigner.getAddress();

  const agentExchangeClient = new hl.ExchangeClient({
    wallet: agentSigner,
    transport,
  });

  const resolvedAgentName = agentName ?? DEFAULT_AGENT_NAME;

  const isAgentApproved = await checkAgentApproval({
    infoClient,
    masterAddress,
    agentAddress,
  });

  return {
    masterSigner,
    masterAddress,
    agentSigner,
    agentAddress,
    agentExchangeClient,
    masterExchangeClient,
    ethersProvider,
    agentName: resolvedAgentName,
    isAgentApproved,
  };
}
