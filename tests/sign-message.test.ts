import { describe, it, expect } from 'vitest';
import { signMessage } from '../src/commands/sign-message';
import { privateKeyToAccount } from 'viem/accounts';
import { verifyMessage } from 'viem';
import type { Hex } from 'viem';

// Well-known test private key (do NOT use in production)
const TEST_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ACCOUNT = privateKeyToAccount(TEST_PRIVATE_KEY);

describe('signMessage', () => {
  it('should sign a message and return the correct address', async () => {
    const result = await signMessage({
      privateKey: TEST_PRIVATE_KEY,
      message: 'hello world',
    });

    expect(result.address).toBe(TEST_ACCOUNT.address);
    expect(result.message).toBe('hello world');
    expect(result.signature).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it('should produce a valid signature that can be verified', async () => {
    const message = 'verify me';
    const result = await signMessage({
      privateKey: TEST_PRIVATE_KEY,
      message,
    });

    const isValid = await verifyMessage({
      address: TEST_ACCOUNT.address,
      message,
      signature: result.signature as Hex,
    });

    expect(isValid).toBe(true);
  });

  it('should produce different signatures for different messages', async () => {
    const result1 = await signMessage({
      privateKey: TEST_PRIVATE_KEY,
      message: 'message one',
    });

    const result2 = await signMessage({
      privateKey: TEST_PRIVATE_KEY,
      message: 'message two',
    });

    expect(result1.signature).not.toBe(result2.signature);
  });

  it('should throw for a private key without 0x prefix', async () => {
    await expect(
      signMessage({
        privateKey: 'not-a-valid-key' as Hex,
        message: 'hello',
      }),
    ).rejects.toThrow('Private key must be a hex string starting with 0x');
  });

  it('should throw for an empty message', async () => {
    await expect(
      signMessage({
        privateKey: TEST_PRIVATE_KEY,
        message: '',
      }),
    ).rejects.toThrow('Message must be a non-empty string');
  });

  it('should sign raw hex data when raw is true', async () => {
    const rawHex = '0x68656c6c6f'; // "hello" in hex
    const result = await signMessage({
      privateKey: TEST_PRIVATE_KEY,
      message: rawHex,
      raw: true,
    });

    expect(result.address).toBe(TEST_ACCOUNT.address);
    expect(result.message).toBe(rawHex);
    expect(result.signature).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it('should produce a verifiable signature in raw mode', async () => {
    const rawHex = '0x68656c6c6f'; // "hello" in hex
    const result = await signMessage({
      privateKey: TEST_PRIVATE_KEY,
      message: rawHex,
      raw: true,
    });

    const isValid = await verifyMessage({
      address: TEST_ACCOUNT.address,
      message: { raw: rawHex as Hex },
      signature: result.signature as Hex,
    });

    expect(isValid).toBe(true);
  });

  it('should throw for non-hex message when raw is true', async () => {
    await expect(
      signMessage({
        privateKey: TEST_PRIVATE_KEY,
        message: 'not-hex-data',
        raw: true,
      }),
    ).rejects.toThrow(
      'Message must be a valid hex string (0x-prefixed) when using raw mode',
    );
  });
});
