import { privateKeyToAccount } from 'viem/accounts';
import { generatePrivateKey } from 'viem/accounts';

export interface GenWalletResult {
  address: string;
  privateKey: string;
}

/**
 * Generates a new random wallet (private key + address).
 */
export function genWallet(): GenWalletResult {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    privateKey,
  };
}
