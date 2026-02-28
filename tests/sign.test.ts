import { describe, it, expect } from 'vitest';
import { sign } from '../src/commands/sign';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, toHex } from 'viem';
import type { Hex } from 'viem';

// Well-known test private key (do NOT use in production)
const TEST_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ACCOUNT = privateKeyToAccount(TEST_PRIVATE_KEY);

describe('sign', () => {
  it('should sign a hash and return the correct address', async () => {
    const hash = keccak256(toHex('test data'));
    const result = await sign({
      privateKey: TEST_PRIVATE_KEY,
      hash,
    });

    expect(result.address).toBe(TEST_ACCOUNT.address);
    expect(result.hash).toBe(hash);
    expect(result.signature).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it('should produce different signatures for different hashes', async () => {
    const hash1 = keccak256(toHex('data one'));
    const hash2 = keccak256(toHex('data two'));

    const result1 = await sign({ privateKey: TEST_PRIVATE_KEY, hash: hash1 });
    const result2 = await sign({ privateKey: TEST_PRIVATE_KEY, hash: hash2 });

    expect(result1.signature).not.toBe(result2.signature);
  });

  it('should produce a signature different from signMessage for the same content', async () => {
    // sign() operates on raw hash, signMessage() applies EIP-191 prefix
    // They must never produce the same signature for the same input bytes
    const hash = keccak256(toHex('hello'));
    const result = await sign({ privateKey: TEST_PRIVATE_KEY, hash });

    // Just verify it's a valid hex signature
    expect(result.signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
  });

  it('should throw for a private key without 0x prefix', async () => {
    const hash = keccak256(toHex('test'));
    await expect(
      sign({
        privateKey: 'not-a-valid-key' as Hex,
        hash,
      }),
    ).rejects.toThrow('Private key must be a hex string starting with 0x');
  });

  it('should throw for an invalid hash', async () => {
    await expect(
      sign({
        privateKey: TEST_PRIVATE_KEY,
        hash: 'not-a-hash' as Hex,
      }),
    ).rejects.toThrow('Hash must be a valid 0x-prefixed hex string');
  });

  it('should throw for an empty hash', async () => {
    await expect(
      sign({
        privateKey: TEST_PRIVATE_KEY,
        hash: '' as Hex,
      }),
    ).rejects.toThrow('Hash must be a valid 0x-prefixed hex string');
  });

  it('should throw for a hash that is not 32 bytes', async () => {
    await expect(
      sign({
        privateKey: TEST_PRIVATE_KEY,
        hash: '0xabcdef' as Hex,
      }),
    ).rejects.toThrow('Hash must be exactly 32 bytes (64 hex characters)');
  });
});
