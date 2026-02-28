import { isHex } from 'viem';
import type { Hex } from 'viem';
import {
  createNetworkClient,
  getNetworkConfig,
  resolveNetwork,
} from '../utils';

export interface TxStatusInput {
  hash: Hex;
  network?: string;
}

export interface TxStatusResult {
  transactionHash: string;
  status: 'success' | 'reverted' | 'pending';
  network: string;
  blockNumber: string | null;
  from: string | null;
  to: string | null;
  gasUsed: string | null;
  effectiveGasPrice: string | null;
  explorerUrl: string;
}

/**
 * Gets the status of a transaction by its hash.
 *
 * Queries the network RPC for the transaction receipt:
 * - If a receipt exists, returns the status (success/reverted) along with block and gas info.
 * - If no receipt exists, the transaction is still pending.
 */
export async function txStatus(input: TxStatusInput): Promise<TxStatusResult> {
  const { hash, network = 'mainnet' } = input;

  if (!hash || !isHex(hash)) {
    throw new Error('Transaction hash must be a valid 0x-prefixed hex string');
  }

  if (hash.length !== 66) {
    throw new Error(
      'Transaction hash must be exactly 32 bytes (66 characters including 0x prefix)',
    );
  }

  const chain = resolveNetwork(network);
  const networkConfig = getNetworkConfig(chain);
  const client = createNetworkClient(chain, networkConfig);

  const explorerBase = chain.blockExplorers?.default?.url;
  const explorerUrl = explorerBase
    ? `${explorerBase}/tx/${hash}`
    : `https://etherscan.io/tx/${hash}`;

  const receipt = await client.getTransactionReceipt({ hash });

  if (!receipt) {
    return {
      transactionHash: hash,
      status: 'pending',
      network: chain.name,
      blockNumber: null,
      from: null,
      to: null,
      gasUsed: null,
      effectiveGasPrice: null,
      explorerUrl,
    };
  }

  return {
    transactionHash: hash,
    status: receipt.status === 'success' ? 'success' : 'reverted',
    network: chain.name,
    blockNumber: receipt.blockNumber.toString(),
    from: receipt.from,
    to: receipt.to ?? null,
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPrice: receipt.effectiveGasPrice.toString(),
    explorerUrl,
  };
}
