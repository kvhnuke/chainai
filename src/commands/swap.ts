import { isAddress, formatUnits, parseUnits, erc20Abi } from 'viem';
import type { Hex } from 'viem';
import {
  NATIVE_TOKEN_ADDRESS,
  resolveNetwork,
  getNetworkConfig,
  createNetworkClient,
  validateAndCreateAccount,
} from '../utils';
import OneInchFusion from '../oneInchFusion/oneInchFusion';

export interface SwapInput {
  privateKey: Hex;
  fromToken: string;
  toToken: string;
  amount: string;
  network?: string;
  confirm?: boolean;
}

/**
 * Fetches the decimals for a token. Returns 18 for the native token.
 */
async function fetchTokenDecimals(
  tokenAddress: string,
  client: ReturnType<typeof createNetworkClient>,
): Promise<number> {
  if (tokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()) {
    return 18;
  }
  const decimals = await client.readContract({
    abi: erc20Abi,
    address: tokenAddress as `0x${string}`,
    functionName: 'decimals',
  });
  return Number(decimals);
}

export interface SwapQuoteResult {
  from: string;
  fromToken: string;
  toToken: string;
  amount: string;
  estimatedReturn: string;
  estimatedReturnMin: string;
  estimatedReturnAvg: string;
  network: string;
}

export interface SwapOrderResult extends SwapQuoteResult {
  orderHash: string;
  approvalTxHash: string | null;
}

/**
 * Gets a quote for a token swap via 1inch Fusion.
 */
export async function getSwapQuote(input: SwapInput): Promise<SwapQuoteResult> {
  const { privateKey, fromToken, toToken, amount, network = 'mainnet' } = input;

  const account = validateAndCreateAccount(privateKey);

  if (!isAddress(fromToken)) {
    throw new Error(
      `fromToken must be a valid 0x-prefixed address. Use ${NATIVE_TOKEN_ADDRESS} for native token.`,
    );
  }
  if (!isAddress(toToken)) {
    throw new Error(
      `toToken must be a valid 0x-prefixed address. Use ${NATIVE_TOKEN_ADDRESS} for native token.`,
    );
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const chain = resolveNetwork(network);
  const networkConfig = getNetworkConfig(chain);
  const client = createNetworkClient(chain, networkConfig);

  const [fromTokenDecimals, toTokenDecimals] = await Promise.all([
    fetchTokenDecimals(fromToken, client),
    fetchTokenDecimals(toToken, client),
  ]);

  const rawAmount = parseUnits(amount, fromTokenDecimals).toString();

  const fusion = new OneInchFusion(networkConfig.nodeUrl, privateKey, chain.id);

  const quote = await fusion.getQuote({
    fromTokenAddress: fromToken,
    toTokenAddress: toToken,
    amount: rawAmount,
    fromAddress: account.address,
    fromTokenDecimals,
    toTokenDecimals,
  });

  return {
    from: account.address,
    fromToken,
    toToken,
    amount,
    estimatedReturn: formatUnits(quote.startAmount, toTokenDecimals),
    estimatedReturnMin: formatUnits(quote.endAmount ?? 0n, toTokenDecimals),
    estimatedReturnAvg: formatUnits(quote.avgAmount ?? 0n, toTokenDecimals),
    network: chain.name,
  };
}

/**
 * Submits a swap order via 1inch Fusion.
 */
export async function submitSwapOrder(
  input: SwapInput,
): Promise<SwapOrderResult> {
  const { privateKey, fromToken, toToken, amount, network = 'mainnet' } = input;

  const account = validateAndCreateAccount(privateKey);

  const chain = resolveNetwork(network);
  const networkConfig = getNetworkConfig(chain);
  const client = createNetworkClient(chain, networkConfig);

  const [fromTokenDecimals, toTokenDecimals] = await Promise.all([
    fetchTokenDecimals(fromToken, client),
    fetchTokenDecimals(toToken, client),
  ]);

  const rawAmount = parseUnits(amount, fromTokenDecimals).toString();

  const fusion = new OneInchFusion(networkConfig.nodeUrl, privateKey, chain.id);

  // Check if approval is required and set it before submitting
  let approvalTxHash: string | null = null;
  const needsApproval = await fusion.isApprovalRequired(
    account.address,
    fromToken,
    BigInt(rawAmount),
  );
  if (needsApproval) {
    approvalTxHash = await fusion.setApproval(account.address, fromToken);
  }

  // Get a fresh quote for the result
  const quote = await fusion.getQuote({
    fromTokenAddress: fromToken,
    toTokenAddress: toToken,
    amount: rawAmount,
    fromAddress: account.address,
    fromTokenDecimals,
    toTokenDecimals,
  });

  const orderResult = await fusion.submitOrder({
    fromTokenAddress: fromToken,
    toTokenAddress: toToken,
    amount: rawAmount,
    fromAddress: account.address,
    fromTokenDecimals,
    toTokenDecimals,
  });

  return {
    from: account.address,
    fromToken,
    toToken,
    amount,
    estimatedReturn: formatUnits(quote.startAmount, toTokenDecimals),
    estimatedReturnMin: formatUnits(quote.endAmount ?? 0n, toTokenDecimals),
    estimatedReturnAvg: formatUnits(quote.avgAmount ?? 0n, toTokenDecimals),
    network: chain.name,
    orderHash: orderResult.hash,
    approvalTxHash,
  };
}
