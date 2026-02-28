import { describe, it, expect } from 'vitest';
import { signTypedData } from '../src/commands/sign-typed-data';
import { privateKeyToAccount } from 'viem/accounts';
import { verifyTypedData } from 'viem';
import type { Hex } from 'viem';

// Well-known test private key (do NOT use in production)
const TEST_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ACCOUNT = privateKeyToAccount(TEST_PRIVATE_KEY);

const SAMPLE_DOMAIN = {
  name: 'TestApp',
  version: '1',
  chainId: 1,
  verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Hex,
};

const SAMPLE_TYPES = {
  Mail: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'contents', type: 'string' },
  ],
};

const SAMPLE_MESSAGE = {
  from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  contents: 'Hello!',
};

describe('signTypedData', () => {
  it('should sign typed data and return the correct address', async () => {
    const result = await signTypedData({
      privateKey: TEST_PRIVATE_KEY,
      domain: SAMPLE_DOMAIN,
      types: SAMPLE_TYPES,
      primaryType: 'Mail',
      message: SAMPLE_MESSAGE,
    });

    expect(result.address).toBe(TEST_ACCOUNT.address);
    expect(result.signature).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it('should produce a valid signature that can be verified', async () => {
    const result = await signTypedData({
      privateKey: TEST_PRIVATE_KEY,
      domain: SAMPLE_DOMAIN,
      types: SAMPLE_TYPES,
      primaryType: 'Mail',
      message: SAMPLE_MESSAGE,
    });

    const isValid = await verifyTypedData({
      address: TEST_ACCOUNT.address,
      domain: SAMPLE_DOMAIN,
      types: SAMPLE_TYPES,
      primaryType: 'Mail',
      message: SAMPLE_MESSAGE,
      signature: result.signature as Hex,
    });

    expect(isValid).toBe(true);
  });

  it('should produce different signatures for different messages', async () => {
    const result1 = await signTypedData({
      privateKey: TEST_PRIVATE_KEY,
      domain: SAMPLE_DOMAIN,
      types: SAMPLE_TYPES,
      primaryType: 'Mail',
      message: SAMPLE_MESSAGE,
    });

    const result2 = await signTypedData({
      privateKey: TEST_PRIVATE_KEY,
      domain: SAMPLE_DOMAIN,
      types: SAMPLE_TYPES,
      primaryType: 'Mail',
      message: { ...SAMPLE_MESSAGE, contents: 'Goodbye!' },
    });

    expect(result1.signature).not.toBe(result2.signature);
  });

  it('should throw for a private key without 0x prefix', async () => {
    await expect(
      signTypedData({
        privateKey: 'not-a-valid-key' as Hex,
        domain: SAMPLE_DOMAIN,
        types: SAMPLE_TYPES,
        primaryType: 'Mail',
        message: SAMPLE_MESSAGE,
      }),
    ).rejects.toThrow('Private key must be a hex string starting with 0x');
  });

  it('should throw for empty types', async () => {
    await expect(
      signTypedData({
        privateKey: TEST_PRIVATE_KEY,
        domain: SAMPLE_DOMAIN,
        types: {},
        primaryType: 'Mail',
        message: SAMPLE_MESSAGE,
      }),
    ).rejects.toThrow(
      'Types must be a non-empty object defining EIP-712 types',
    );
  });

  it('should throw for empty primaryType', async () => {
    await expect(
      signTypedData({
        privateKey: TEST_PRIVATE_KEY,
        domain: SAMPLE_DOMAIN,
        types: SAMPLE_TYPES,
        primaryType: '',
        message: SAMPLE_MESSAGE,
      }),
    ).rejects.toThrow('Primary type must be a non-empty string');
  });
});
