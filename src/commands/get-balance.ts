import { formatUnits, isAddress } from 'viem';
import type { Hex, Chain } from 'viem';
import {
  NATIVE_TOKEN_ADDRESS,
  createNetworkClient,
  getNetworkConfig,
  getTokenBalances,
  resolveNetwork,
} from '../utils';

export interface GetBalanceInput {
  address: Hex;
  network?: string;
  token?: string;
  all?: boolean;
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
 * Fetches the balance of a native token or ERC-20 token for a given address.
 *
 * - For native tokens (ETH, BNB, etc.), uses the node RPC via viem.
 * - For ERC-20 tokens, uses the MEW balances API.
 */
export async function getBalance(
  input: GetBalanceInput,
): Promise<GetBalanceResult | GetBalanceResult[]> {
  const {
    address,
    network = 'mainnet',
    token = NATIVE_TOKEN_ADDRESS,
    all = false,
  } = input;

  if (!address || !address.startsWith('0x')) {
    throw new Error('Address must be a valid 0x-prefixed hex string');
  }

  const chain = resolveNetwork(network);
  const networkConfig = getNetworkConfig(chain);

  if (all) {
    return getAllBalances(address, chain, networkConfig);
  }

  if (!isAddress(token)) {
    throw new Error(
      `Token must be a valid 0x-prefixed address. Use ${NATIVE_TOKEN_ADDRESS} for native token.`,
    );
  }

  const isNative = token.toLowerCase() === NATIVE_TOKEN_ADDRESS;

  if (isNative) {
    const client = createNetworkClient(chain, networkConfig);

    const balanceWei = await client.getBalance({ address });
    const formatted = formatUnits(balanceWei, chain.nativeCurrency.decimals);

    return {
      address,
      network: chain.name,
      token: chain.nativeCurrency.symbol,
      balance: formatted,
      rawBalance: balanceWei.toString(),
      decimals: chain.nativeCurrency.decimals,
      contract: NATIVE_TOKEN_ADDRESS,
    };
  }

  // ERC-20 token: look up from balances API
  const balances = await getTokenBalances(chain.id, address);
  const tokenLower = token.toLowerCase();
  const found = balances.find((t) => t.contract.toLowerCase() === tokenLower);

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

/**
 * Fetches all token balances (native + ERC-20) for a given address.
 */
async function getAllBalances(
  address: Hex,
  chain: Chain,
  networkConfig: { balances: string; nodeUrl: string },
): Promise<GetBalanceResult[]> {
  const [tokenBalances] = await Promise.all([
    getTokenBalances(chain.id, address),
  ]);
  const results: GetBalanceResult[] = [];
  // All balances including Native
  for (const t of tokenBalances) {
    const raw = BigInt(t.balance);
    results.push({
      address,
      network: chain.name,
      token: t.symbol,
      balance: formatUnits(raw, t.decimals),
      rawBalance: raw.toString(),
      decimals: t.decimals,
      contract: t.contract,
    });
  }

  return results;
}
