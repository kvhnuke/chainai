import type { Hex } from 'viem';
import {
  resolveNetwork,
  getNetworkConfig,
  validateAndCreateAccount,
} from '../utils';
import OneInchFusion from '../oneInchFusion/oneInchFusion';

export interface SwapOrderStatusInput {
  privateKey: Hex;
  orderHash: string;
  network?: string;
}

export interface SwapOrderStatusResult {
  orderHash: string;
  status: string;
  network: string;
  createdAt: number;
  duration: number;
  fills: { txHash: string }[];
  cancelTx: string | null;
  finalToAmount: string | null;
}

/**
 * Gets the status of a swap order by its order hash.
 */
export async function swapOrderStatus(
  input: SwapOrderStatusInput,
): Promise<SwapOrderStatusResult> {
  const { privateKey, orderHash, network = 'mainnet' } = input;

  validateAndCreateAccount(privateKey);

  if (!orderHash || typeof orderHash !== 'string') {
    throw new Error('Order hash is required');
  }

  const chain = resolveNetwork(network);
  const networkConfig = getNetworkConfig(chain);

  const fusion = new OneInchFusion(networkConfig.nodeUrl, privateKey, chain.id);

  const status = await fusion.getOrderStatus(orderHash);

  return {
    orderHash,
    status: status.status,
    network: chain.name,
    createdAt: status.createdAt,
    duration: status.duration,
    fills: status.fills,
    cancelTx: status.cancelTx ?? null,
    finalToAmount: status.finalToAmount
      ? status.finalToAmount.toString()
      : null,
  };
}
