import { isHex } from 'viem';
import type { Hex } from 'viem';
import { validateAndCreateAccount } from '../utils';

export interface SignMessageInput {
  privateKey: Hex;
  message: string;
  raw?: boolean;
}

export interface SignMessageResult {
  address: string;
  message: string;
  signature: string;
}

/**
 * Signs a message using the provided private key via viem.
 * Returns the signer address, original message, and resulting signature.
 */
export async function signMessage(
  input: SignMessageInput,
): Promise<SignMessageResult> {
  const { privateKey, message } = input;

  if (!message || message.length === 0) {
    throw new Error('Message must be a non-empty string');
  }

  const account = validateAndCreateAccount(privateKey);

  if (input.raw) {
    if (!isHex(message, { strict: true })) {
      throw new Error(
        'Message must be a valid hex string (0x-prefixed) when using raw mode',
      );
    }
    const signature = await account.signMessage({
      message: { raw: message as Hex },
    });
    return {
      address: account.address,
      message,
      signature,
    };
  }

  const signature = await account.signMessage({ message });

  return {
    address: account.address,
    message,
    signature,
  };
}
