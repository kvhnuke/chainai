import { describe, it, expect } from 'vitest';
import { genWallet } from '../commands/gen-wallet';
import { isAddress, isHex } from 'viem';

describe('gen-wallet', () => {
  it('should generate a valid private key and address', () => {
    const result = genWallet();
    expect(result.privateKey).toBeDefined();
    expect(result.privateKey.startsWith('0x')).toBe(true);
    expect(isHex(result.privateKey)).toBe(true);
    // 0x + 64 hex chars = 66
    expect(result.privateKey.length).toBe(66);
    expect(result.address).toBeDefined();
    expect(isAddress(result.address)).toBe(true);
  });

  it('should generate different wallets on each call', () => {
    const wallet1 = genWallet();
    const wallet2 = genWallet();
    expect(wallet1.privateKey).not.toBe(wallet2.privateKey);
    expect(wallet1.address).not.toBe(wallet2.address);
  });
});
