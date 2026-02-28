import { describe, it, expect, vi, beforeEach } from 'vitest';
import { swapOrderStatus } from '../src/commands/swap-order-status';
import type { Hex } from 'viem';

const TEST_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const MOCK_ORDER_STATUS_FILLED = {
  status: 'filled',
  cancelTx: null,
  createdAt: 1700000000,
  duration: 180,
  fills: [{ txHash: '0xfilltxhash123' }],
  finalToAmount: BigInt('1500000000'),
};

const MOCK_ORDER_STATUS_PENDING = {
  status: 'pending',
  cancelTx: null,
  createdAt: 1700000000,
  duration: 180,
  fills: [],
};

// Mock OneInchFusion
vi.mock('../src/oneInchFusion/oneInchFusion', () => {
  const MockOneInchFusion = vi.fn(function (this: any) {
    this.getOrderStatus = vi.fn().mockResolvedValue(MOCK_ORDER_STATUS_FILLED);
  });
  return { default: MockOneInchFusion };
});

describe('swap-order-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return status for a filled order', async () => {
    const result = await swapOrderStatus({
      privateKey: TEST_PRIVATE_KEY,
      orderHash: '0xorderhash123',
      network: 'mainnet',
    });

    expect(result.orderHash).toBe('0xorderhash123');
    expect(result.status).toBe('filled');
    expect(result.network).toBe('Ethereum');
    expect(result.createdAt).toBe(1700000000);
    expect(result.duration).toBe(180);
    expect(result.fills).toEqual([{ txHash: '0xfilltxhash123' }]);
    expect(result.cancelTx).toBeNull();
    expect(result.finalToAmount).toBe('1500000000');
  });

  it('should return status for a pending order', async () => {
    const OneInchFusion = (await import('../src/oneInchFusion/oneInchFusion'))
      .default;
    (OneInchFusion as any).mockImplementation(function (this: any) {
      this.getOrderStatus = vi
        .fn()
        .mockResolvedValue(MOCK_ORDER_STATUS_PENDING);
    });

    const result = await swapOrderStatus({
      privateKey: TEST_PRIVATE_KEY,
      orderHash: '0xorderhash456',
      network: 'mainnet',
    });

    expect(result.status).toBe('pending');
    expect(result.fills).toEqual([]);
    expect(result.finalToAmount).toBeNull();
  });

  it('should work on bsc network', async () => {
    const result = await swapOrderStatus({
      privateKey: TEST_PRIVATE_KEY,
      orderHash: '0xorderhash789',
      network: 'bsc',
    });

    expect(result.network).toBe('BNB Smart Chain');
  });

  it('should throw for missing order hash', async () => {
    await expect(
      swapOrderStatus({
        privateKey: TEST_PRIVATE_KEY,
        orderHash: '',
        network: 'mainnet',
      }),
    ).rejects.toThrow('Order hash is required');
  });

  it('should throw for invalid private key', async () => {
    await expect(
      swapOrderStatus({
        privateKey: '' as Hex,
        orderHash: '0xorderhash123',
        network: 'mainnet',
      }),
    ).rejects.toThrow('Private key must be a hex string starting with 0x');
  });
});
