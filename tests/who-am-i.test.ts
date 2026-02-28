import { describe, it, expect } from 'vitest';
import { whoAmI } from '../src/commands/who-am-i';
import type { Hex } from 'viem';

const TEST_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

describe('who-am-i', () => {
  it('should return the correct address for a valid private key', () => {
    const result = whoAmI({ privateKey: TEST_PRIVATE_KEY });
    expect(result.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  });

  it('should throw for a missing private key', () => {
    expect(() => whoAmI({ privateKey: '' as Hex })).toThrow(
      'Private key must be a hex string starting with 0x',
    );
  });

  it('should throw for a non-hex private key', () => {
    expect(() => whoAmI({ privateKey: 'not-a-key' as Hex })).toThrow(
      'Private key must be a hex string starting with 0x',
    );
  });
});
