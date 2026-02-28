import { privateKeyToAccount } from 'viem/accounts';
import { isHex } from 'viem';
import type {
  Hex,
  TransactionSerializableEIP1559,
  TransactionSerializableEIP2930,
  TransactionSerializableLegacy,
} from 'viem';

export type TransactionInput =
  | TransactionSerializableLegacy
  | TransactionSerializableEIP2930
  | TransactionSerializableEIP1559;

export interface SignTransactionInput {
  privateKey: Hex;
  transaction: TransactionInput;
}

export interface SignTransactionResult {
  address: string;
  serializedTransaction: string;
}

/**
 * Signs a transaction using the provided private key via viem.
 * Returns the signer address and the serialized signed transaction
 * (RLP-encoded, ready to broadcast).
 *
 * ⚠️  SECURITY NOTE ⚠️
 * This produces a fully signed transaction that can be broadcast to a network.
 * Agents should verify transaction parameters (to, value, data, chainId)
 * before signing.
 */
export async function signTransaction(
  input: SignTransactionInput,
): Promise<SignTransactionResult> {
  const { privateKey, transaction } = input;

  if (!privateKey || !privateKey.startsWith('0x')) {
    throw new Error('Private key must be a hex string starting with 0x');
  }

  if (!transaction || typeof transaction !== 'object') {
    throw new Error('Transaction must be a valid transaction object');
  }

  if (transaction.to && !isHex(transaction.to, { strict: true })) {
    throw new Error(
      'Transaction "to" field must be a valid 0x-prefixed hex address',
    );
  }

  const account = privateKeyToAccount(privateKey);
  const serializedTransaction = await account.signTransaction(transaction);

  return {
    address: account.address,
    serializedTransaction,
  };
}
