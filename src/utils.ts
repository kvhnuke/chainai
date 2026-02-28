import { createPublicClient, http, isAddress } from 'viem';
import type { Hex, Chain, PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SUPPORTED_NETWORKS, SUPPORTED_NETWORKS_NAME_MAP } from './configs';

const BALANCES_API_BASE = 'https://partners.mewapi.io/balances';

/**
 * Canonical address representing the native token (ETH, BNB, etc.).
 */
export const NATIVE_TOKEN_ADDRESS =
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as const;

export interface TokenBalance {
  balance: string;
  contract: string;
  decimals: number;
  logo_url: string;
  name: string;
  price: number;
  symbol: string;
}

interface BalancesApiResponse {
  result: TokenBalance[];
}

/**
 * Validates a private key and returns a viem LocalAccount.
 * Throws if the key is missing or not 0x-prefixed.
 */
export function validateAndCreateAccount(privateKey: Hex) {
  if (!privateKey || !privateKey.startsWith('0x')) {
    throw new Error('Private key must be a hex string starting with 0x');
  }
  return privateKeyToAccount(privateKey);
}

/**
 * Validates that a value is a valid Ethereum address.
 * Throws with the given label if invalid.
 */
export function validateAddress(address: string, label: string): void {
  if (!isAddress(address)) {
    throw new Error(`${label} must be a valid 0x-prefixed address`);
  }
}

/**
 * Resolves a network name, alias, or chain ID string to a supported Chain.
 * Throws if the network is not supported.
 */
export function resolveNetwork(network: string): Chain {
  // Try matching by chain ID
  const asNumber = Number(network);
  if (!isNaN(asNumber)) {
    const chain = SUPPORTED_NETWORKS.find((c) => c.id === asNumber);
    if (chain) return chain;
  }

  // Try matching by name / alias (case-insensitive)
  const lower = network.toLowerCase();
  const chain = SUPPORTED_NETWORKS.find(
    (c) =>
      c.name.toLowerCase() === lower ||
      (c.id === 1 &&
        (lower === 'mainnet' || lower === 'ethereum' || lower === 'eth')) ||
      (c.id === 56 &&
        (lower === 'bsc' || lower === 'binance' || lower === 'bnb')),
  );

  if (!chain) {
    const supported = SUPPORTED_NETWORKS.map((c) => `${c.name} (${c.id})`).join(
      ', ',
    );
    throw new Error(
      `Unsupported network: "${network}". Supported networks: ${supported}`,
    );
  }

  return chain;
}

/**
 * Returns the network config for a given chain, or throws listing supported chains.
 */
export function getNetworkConfig(chain: Chain) {
  const networkConfig = SUPPORTED_NETWORKS_NAME_MAP[chain.id];
  if (!networkConfig) {
    const supported = SUPPORTED_NETWORKS.map((c) => `${c.name} (${c.id})`).join(
      ', ',
    );
    throw new Error(
      `Chain "${chain.name}" (${chain.id}) is not supported. Supported chains: ${supported}`,
    );
  }
  return networkConfig;
}

/**
 * Creates a viem PublicClient for the given chain.
 */
export function createNetworkClient(
  chain: Chain,
  networkConfig: { nodeUrl: string },
): PublicClient {
  return createPublicClient({
    chain,
    transport: http(networkConfig.nodeUrl),
  }) as PublicClient;
}

/**
 * Returns the balances network name for a given chain ID,
 * or undefined if the chain is not supported.
 */
function getBalancesNetworkName(chainId: number): string | undefined {
  const entry = SUPPORTED_NETWORKS_NAME_MAP[chainId];
  if (!entry) return undefined;
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && 'balances' in entry) return entry.balances;
  return undefined;
}

/**
 * Fetches token balances for a given address on the specified chain.
 *
 * @param chainId - The chain ID (must be in SUPPORTED_NETWORKS)
 * @param address - The wallet address (0x-prefixed hex string)
 * @returns Array of token balances
 */
export async function getTokenBalances(
  chainId: number,
  address: string,
): Promise<TokenBalance[]> {
  const networkName = getBalancesNetworkName(chainId);
  if (!networkName) {
    throw new Error(
      `Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(SUPPORTED_NETWORKS_NAME_MAP).join(', ')}`,
    );
  }

  if (!address || !address.startsWith('0x')) {
    throw new Error('Address must be a valid 0x-prefixed hex string');
  }

  const url = `${BALANCES_API_BASE}/${networkName}/${address}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch balances: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as BalancesApiResponse;
  return data.result;
}
