import type { Hex } from 'viem';
import { validateAndCreateAccount } from '../utils';

export interface WhoAmIInput {
  privateKey: Hex;
}

export interface WhoAmIResult {
  address: string;
}

/**
 * Returns the Ethereum address derived from the given private key.
 */
export function whoAmI(input: WhoAmIInput): WhoAmIResult {
  const account = validateAndCreateAccount(input.privateKey);
  return {
    address: account.address,
  };
}
