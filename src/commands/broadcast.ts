import { isHex } from 'viem';
import type { Hex } from 'viem';
import {
  createNetworkClient,
  getNetworkConfig,
  resolveNetwork,
} from '../utils';

export interface BroadcastInput {
  serializedTransaction: Hex;
  network?: string;
}

export interface BroadcastResult {
  transactionHash: string;
  network: string;
  explorerUrl: string;
}

/**
 * Broadcasts a serialized signed transaction to the network.
 *
 * Takes a hex-encoded RLP-serialized signed transaction (e.g. from `sign-transaction` or `send`)
 * and submits it via `eth_sendRawTransaction`.
 *
 * Returns the transaction hash on success.
 */
export async function broadcast(
  input: BroadcastInput,
): Promise<BroadcastResult> {
  const { serializedTransaction, network = 'mainnet' } = input;

  if (!serializedTransaction || !isHex(serializedTransaction)) {
    throw new Error(
      'Serialized transaction must be a valid 0x-prefixed hex string',
    );
  }

  const chain = resolveNetwork(network);
  const networkConfig = getNetworkConfig(chain);
  const client = createNetworkClient(chain, networkConfig);

  const transactionHash = await client.sendRawTransaction({
    serializedTransaction,
  });

  const explorerBase = chain.blockExplorers?.default?.url;
  const explorerUrl = explorerBase
    ? `${explorerBase}/tx/${transactionHash}`
    : `https://etherscan.io/tx/${transactionHash}`;

  return {
    transactionHash,
    network: chain.name,
    explorerUrl,
  };
}
