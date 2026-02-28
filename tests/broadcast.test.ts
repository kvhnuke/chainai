import { describe, it, expect, vi, beforeEach } from 'vitest';
import { broadcast } from '../src/commands/broadcast';
import type { Hex } from 'viem';

const FAKE_TX_HASH =
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hex;

// A plausible serialized transaction hex (doesn't need to be real for unit tests)
const SERIALIZED_TX = '0x02f86c0105843b9aca00851bf08eb000825208' as Hex;

// Mock utils to avoid real RPC calls
vi.mock('../src/utils', async () => {
  const actual = await vi.importActual<typeof import('../src/utils')>('../src/utils');
  return {
    ...actual,
    createNetworkClient: vi.fn(() => ({
      sendRawTransaction: vi.fn().mockResolvedValue(FAKE_TX_HASH),
    })),
  };
});

describe('broadcast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should broadcast a serialized transaction and return the hash', async () => {
    const result = await broadcast({
      serializedTransaction: SERIALIZED_TX,
    });

    expect(result.transactionHash).toBe(FAKE_TX_HASH);
    expect(result.network).toBe('Ethereum');
    expect(result.explorerUrl).toBe(`https://etherscan.io/tx/${FAKE_TX_HASH}`);
  });

  it('should accept a network parameter', async () => {
    const result = await broadcast({
      serializedTransaction: SERIALIZED_TX,
      network: 'bsc',
    });

    expect(result.transactionHash).toBe(FAKE_TX_HASH);
    expect(result.network).toBe('BNB Smart Chain');
    expect(result.explorerUrl).toBe(`https://bscscan.com/tx/${FAKE_TX_HASH}`);
  });

  it('should accept chain ID as network', async () => {
    const result = await broadcast({
      serializedTransaction: SERIALIZED_TX,
      network: '56',
    });

    expect(result.network).toBe('BNB Smart Chain');
  });

  it('should throw for missing serialized transaction', async () => {
    await expect(
      broadcast({
        serializedTransaction: '' as Hex,
      }),
    ).rejects.toThrow(
      'Serialized transaction must be a valid 0x-prefixed hex string',
    );
  });

  it('should throw for non-hex serialized transaction', async () => {
    await expect(
      broadcast({
        serializedTransaction: 'not-a-hex-string' as Hex,
      }),
    ).rejects.toThrow(
      'Serialized transaction must be a valid 0x-prefixed hex string',
    );
  });

  it('should throw for unsupported network', async () => {
    await expect(
      broadcast({
        serializedTransaction: SERIALIZED_TX,
        network: 'unsupported',
      }),
    ).rejects.toThrow('Unsupported network');
  });

  it('should default to mainnet when network is not specified', async () => {
    const result = await broadcast({
      serializedTransaction: SERIALIZED_TX,
    });

    expect(result.network).toBe('Ethereum');
  });
});
