import { createPublicClient, formatUnits, http } from 'viem';
import type { Hex, Chain } from 'viem';
import { SUPPORTED_NETWORKS, SUPPORTED_NETWORKS_NAME_MAP } from '../configs';
import { getTokenBalances } from '../utils';

export interface GetBalanceInput {
  address: Hex;
  network?: string;
  token?: string;
}

export interface GetBalanceResult {
  address: string;
  network: string;
  token: string;
  balance: string;
  rawBalance: string;
  decimals: number;
  contract: string | null;
}

/**
 * Resolves a network name or chain ID to a supported chain config.
 */
function resolveNetwork(network: string): Chain {
  // Try matching by chain ID
  const asNumber = Number(network);
  if (!isNaN(asNumber)) {
    const chain = SUPPORTED_NETWORKS.find((c) => c.id === asNumber);
    if (chain) return chain;
  }

  // Try matching by name (case-insensitive)
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
 * Fetches the balance of a native token or ERC-20 token for a given address.
 *
 * - For native tokens (ETH, BNB, etc.), uses the node RPC via viem.
 * - For ERC-20 tokens, uses the MEW balances API.
 */
export async function getBalance(
  input: GetBalanceInput,
): Promise<GetBalanceResult> {
  const { address, network = 'mainnet', token = 'ETH' } = input;

  if (!address || !address.startsWith('0x')) {
    throw new Error('Address must be a valid 0x-prefixed hex string');
  }

  const chain = resolveNetwork(network);
  const networkConfig = SUPPORTED_NETWORKS_NAME_MAP[chain.id];

  if (!networkConfig) {
    const supported = SUPPORTED_NETWORKS.map((c) => `${c.name} (${c.id})`).join(
      ', ',
    );
    throw new Error(
      `Chain "${chain.name}" (${chain.id}) is not supported. Supported chains: ${supported}`,
    );
  }

  const nativeSymbol = chain.nativeCurrency.symbol.toUpperCase();
  const isNative =
    token.toUpperCase() === nativeSymbol ||
    (token.toUpperCase() === 'ETH' && chain.id === 1) ||
    (token.toUpperCase() === 'BNB' && chain.id === 56);

  if (isNative) {
    const client = createPublicClient({
      chain,
      transport: http(networkConfig.nodeUrl),
    });

    const balanceWei = await client.getBalance({ address });
    const formatted = formatUnits(balanceWei, chain.nativeCurrency.decimals);

    return {
      address,
      network: chain.name,
      token: chain.nativeCurrency.symbol,
      balance: formatted,
      rawBalance: balanceWei.toString(),
      decimals: chain.nativeCurrency.decimals,
      contract: null,
    };
  }

  // ERC-20 token: look up from balances API
  const balances = await getTokenBalances(chain.id, address);
  const tokenUpper = token.toUpperCase();
  const found = balances.find(
    (t) =>
      t.symbol.toUpperCase() === tokenUpper ||
      t.contract.toLowerCase() === token.toLowerCase(),
  );

  if (!found) {
    throw new Error(
      `Token "${token}" not found for address ${address} on ${chain.name}. The address may not hold this token.`,
    );
  }

  const rawBalance = BigInt(found.balance);
  const formatted = formatUnits(rawBalance, found.decimals);

  return {
    address,
    network: chain.name,
    token: found.symbol,
    balance: formatted,
    rawBalance: rawBalance.toString(),
    decimals: found.decimals,
    contract: found.contract,
  };
}
