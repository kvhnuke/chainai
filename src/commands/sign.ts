import { isHex } from 'viem';
import type { Hex } from 'viem';
import { validateAndCreateAccount } from '../utils';

export interface SignInput {
  privateKey: Hex;
  hash: Hex;
}

export interface SignResult {
  address: string;
  hash: string;
  signature: string;
}

/**
 * Signs raw data using account.sign (secp256k1 signature over a digest).
 *
 * ⚠️  CRITICAL SECURITY WARNING ⚠️
 * This function signs arbitrary hashes WITHOUT any prefix or envelope.
 * The resulting signature can authorize transactions, token transfers,
 * contract interactions, or any on-chain action — potentially without
 * the user's knowledge or explicit consent.
 *
 * Only use this when absolutely necessary. Prefer `signMessage` (EIP-191)
 * whenever possible, as it applies a human-readable prefix that prevents
 * signed data from being replayed as a transaction.
 */
export async function sign(input: SignInput): Promise<SignResult> {
  const { privateKey, hash } = input;

  if (!hash || !isHex(hash, { strict: true })) {
    throw new Error('Hash must be a valid 0x-prefixed hex string');
  }

  // 32 bytes = 64 hex characters + '0x' prefix = 66 characters
  if (hash.length !== 66) {
    throw new Error('Hash must be exactly 32 bytes (64 hex characters)');
  }

  const account = validateAndCreateAccount(privateKey);
  const signature = await account.sign({ hash });

  return {
    address: account.address,
    hash,
    signature,
  };
}
