import { privateKeyToAccount } from 'viem/accounts';
import type { Hex, TypedDataDomain } from 'viem';

export interface TypedDataField {
  name: string;
  type: string;
}

export interface SignTypedDataInput {
  privateKey: Hex;
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

export interface SignTypedDataResult {
  address: string;
  signature: string;
}

/**
 * Signs EIP-712 typed data using the provided private key via viem.
 * Returns the signer address and resulting signature.
 */
export async function signTypedData(
  input: SignTypedDataInput,
): Promise<SignTypedDataResult> {
  const { privateKey, domain, types, primaryType, message } = input;

  if (!privateKey || !privateKey.startsWith('0x')) {
    throw new Error('Private key must be a hex string starting with 0x');
  }

  if (!domain || typeof domain !== 'object') {
    throw new Error('Domain must be a valid EIP-712 domain object');
  }

  if (!types || typeof types !== 'object' || Object.keys(types).length === 0) {
    throw new Error('Types must be a non-empty object defining EIP-712 types');
  }

  if (!primaryType || typeof primaryType !== 'string') {
    throw new Error('Primary type must be a non-empty string');
  }

  if (!message || typeof message !== 'object') {
    throw new Error('Message must be a valid object');
  }

  const account = privateKeyToAccount(privateKey);
  const signature = await account.signTypedData({
    domain,
    types,
    primaryType,
    message,
  });

  return {
    address: account.address,
    signature,
  };
}
