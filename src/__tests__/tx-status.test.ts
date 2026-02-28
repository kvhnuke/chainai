import { describe, it, expect, vi, beforeEach } from 'vitest';
import { txStatus } from '../commands/tx-status';
import type { Hex } from 'viem';

const FAKE_TX_HASH =
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hex;

const MOCK_RECEIPT = {
  status: 'success' as const,
  blockNumber: BigInt(12345678),
  from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  gasUsed: BigInt(21000),
  effectiveGasPrice: BigInt(30000000000),
};

vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils');
  return {
    ...actual,
    createNetworkClient: vi.fn(() => ({
      getTransactionReceipt: vi.fn().mockResolvedValue(MOCK_RECEIPT),
    })),
  };
});

describe('tx-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success status for a confirmed transaction', async () => {
    const result = await txStatus({ hash: FAKE_TX_HASH });

    expect(result.transactionHash).toBe(FAKE_TX_HASH);
    expect(result.status).toBe('success');
    expect(result.network).toBe('Ethereum');
    expect(result.blockNumber).toBe('12345678');
    expect(result.from).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(result.to).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
    expect(result.gasUsed).toBe('21000');
    expect(result.effectiveGasPrice).toBe('30000000000');
    expect(result.explorerUrl).toContain(FAKE_TX_HASH);
  });

  it('should return reverted status for a failed transaction', async () => {
    const { createNetworkClient } = await import('../utils');
    (createNetworkClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      getTransactionReceipt: vi.fn().mockResolvedValue({
        ...MOCK_RECEIPT,
        status: 'reverted',
      }),
    });

    const result = await txStatus({ hash: FAKE_TX_HASH });
    expect(result.status).toBe('reverted');
  });

  it('should return pending status when no receipt exists', async () => {
    const { createNetworkClient } = await import('../utils');
    (createNetworkClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      getTransactionReceipt: vi.fn().mockResolvedValue(null),
    });

    const result = await txStatus({ hash: FAKE_TX_HASH });

    expect(result.status).toBe('pending');
    expect(result.blockNumber).toBeNull();
    expect(result.from).toBeNull();
    expect(result.to).toBeNull();
    expect(result.gasUsed).toBeNull();
    expect(result.effectiveGasPrice).toBeNull();
  });

  it('should accept a network parameter', async () => {
    const result = await txStatus({
      hash: FAKE_TX_HASH,
      network: 'bsc',
    });

    expect(result.network).toBe('BNB Smart Chain');
    expect(result.explorerUrl).toContain('bscscan.com');
  });

  it('should accept chain ID as network', async () => {
    const result = await txStatus({
      hash: FAKE_TX_HASH,
      network: '56',
    });

    expect(result.network).toBe('BNB Smart Chain');
  });

  it('should throw for missing hash', async () => {
    await expect(txStatus({ hash: '' as Hex })).rejects.toThrow(
      'Transaction hash must be a valid 0x-prefixed hex string',
    );
  });

  it('should throw for non-hex hash', async () => {
    await expect(txStatus({ hash: 'not-a-hash' as Hex })).rejects.toThrow(
      'Transaction hash must be a valid 0x-prefixed hex string',
    );
  });

  it('should throw for wrong-length hash', async () => {
    await expect(txStatus({ hash: '0xabcdef' as Hex })).rejects.toThrow(
      'Transaction hash must be exactly 32 bytes',
    );
  });

  it('should throw for unsupported network', async () => {
    await expect(
      txStatus({ hash: FAKE_TX_HASH, network: 'unsupported' }),
    ).rejects.toThrow('Unsupported network');
  });
});
