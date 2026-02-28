import { SUPPORTED_NETWORKS_NAME_MAP } from './configs';

const BALANCES_API_BASE = 'https://partners.mewapi.io/balances';

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
