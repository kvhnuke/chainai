import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSwapQuote, submitSwapOrder } from '../commands/swap';
import type { Hex } from 'viem';

const TEST_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const NATIVE_TOKEN = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7';

const MOCK_QUOTE = {
  startAmount: BigInt('1500000000'),
  endAmount: BigInt('1400000000'),
  avgAmount: BigInt('1450000000'),
};

const MOCK_ORDER = {
  hash: '0xorderhash1234567890',
};

// Mock OneInchFusion
vi.mock('../oneInchFusion/oneInchFusion', () => {
  const MockOneInchFusion = vi.fn(function (this: any) {
    this.getQuote = vi.fn().mockResolvedValue(MOCK_QUOTE);
    this.submitOrder = vi.fn().mockResolvedValue(MOCK_ORDER);
    this.isApprovalRequired = vi.fn().mockResolvedValue(false);
    this.setApproval = vi.fn().mockResolvedValue('0xapprovalhash123');
  });
  return { default: MockOneInchFusion };
});

// Mock utils to provide createNetworkClient with a mock readContract
vi.mock('../utils', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createNetworkClient: vi.fn().mockReturnValue({
      readContract: vi.fn().mockResolvedValue(6), // default mock: 6 decimals (USDT-like)
    }),
  };
});

describe('swap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSwapQuote', () => {
    it('should return a quote for a token swap', async () => {
      const result = await getSwapQuote({
        privateKey: TEST_PRIVATE_KEY,
        fromToken: NATIVE_TOKEN,
        toToken: USDT_CONTRACT,
        amount: '1.5',
        network: 'mainnet',
      });

      expect(result.from).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      expect(result.fromToken).toBe(NATIVE_TOKEN);
      expect(result.toToken).toBe(USDT_CONTRACT);
      expect(result.amount).toBe('1.5');
      expect(result.estimatedReturn).toBe('1500');
      expect(result.estimatedReturnMin).toBe('1400');
      expect(result.estimatedReturnAvg).toBe('1450');
      expect(result.network).toBe('Ethereum');
    });

    it('should accept bsc network parameter', async () => {
      const result = await getSwapQuote({
        privateKey: TEST_PRIVATE_KEY,
        fromToken: NATIVE_TOKEN,
        toToken: USDT_CONTRACT,
        amount: '1.5',
        network: 'bsc',
      });

      expect(result.network).toBe('BNB Smart Chain');
    });

    it('should throw for invalid fromToken address', async () => {
      await expect(
        getSwapQuote({
          privateKey: TEST_PRIVATE_KEY,
          fromToken: 'not-an-address',
          toToken: USDT_CONTRACT,
          amount: '1000',
        }),
      ).rejects.toThrow('fromToken must be a valid 0x-prefixed address');
    });

    it('should throw for invalid toToken address', async () => {
      await expect(
        getSwapQuote({
          privateKey: TEST_PRIVATE_KEY,
          fromToken: NATIVE_TOKEN,
          toToken: 'bad-address',
          amount: '1000',
        }),
      ).rejects.toThrow('toToken must be a valid 0x-prefixed address');
    });

    it('should throw for invalid amount', async () => {
      await expect(
        getSwapQuote({
          privateKey: TEST_PRIVATE_KEY,
          fromToken: NATIVE_TOKEN,
          toToken: USDT_CONTRACT,
          amount: '-5',
        }),
      ).rejects.toThrow('Amount must be a positive number');
    });

    it('should throw for invalid private key', async () => {
      await expect(
        getSwapQuote({
          privateKey: '' as Hex,
          fromToken: NATIVE_TOKEN,
          toToken: USDT_CONTRACT,
          amount: '1000',
        }),
      ).rejects.toThrow('Private key must be a hex string starting with 0x');
    });
  });

  describe('submitSwapOrder', () => {
    it('should submit a swap order and return the order hash', async () => {
      const result = await submitSwapOrder({
        privateKey: TEST_PRIVATE_KEY,
        fromToken: NATIVE_TOKEN,
        toToken: USDT_CONTRACT,
        amount: '1.5',
        network: 'mainnet',
      });

      expect(result.from).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      expect(result.orderHash).toBe('0xorderhash1234567890');
      expect(result.network).toBe('Ethereum');
      expect(result.estimatedReturn).toBe('1500');
    });

    it('should work on bsc network', async () => {
      const result = await submitSwapOrder({
        privateKey: TEST_PRIVATE_KEY,
        fromToken: NATIVE_TOKEN,
        toToken: USDT_CONTRACT,
        amount: '1.5',
        network: 'bsc',
      });

      expect(result.network).toBe('BNB Smart Chain');
      expect(result.orderHash).toBe('0xorderhash1234567890');
    });

    it('should not call setApproval when approval is not required', async () => {
      const result = await submitSwapOrder({
        privateKey: TEST_PRIVATE_KEY,
        fromToken: USDT_CONTRACT,
        toToken: NATIVE_TOKEN,
        amount: '100',
        network: 'mainnet',
      });

      const OneInchFusion = (await import('../oneInchFusion/oneInchFusion'))
        .default;
      const instance = (OneInchFusion as any).mock.results[0].value;
      expect(instance.isApprovalRequired).toHaveBeenCalledOnce();
      expect(instance.setApproval).not.toHaveBeenCalled();
      expect(result.approvalTxHash).toBeNull();
    });

    it('should call setApproval when approval is required', async () => {
      const OneInchFusion = (await import('../oneInchFusion/oneInchFusion'))
        .default;

      // Override mock to require approval for this test
      (OneInchFusion as any).mockImplementation(function (this: any) {
        this.getQuote = vi.fn().mockResolvedValue(MOCK_QUOTE);
        this.submitOrder = vi.fn().mockResolvedValue(MOCK_ORDER);
        this.isApprovalRequired = vi.fn().mockResolvedValue(true);
        this.setApproval = vi.fn().mockResolvedValue('0xapprovaltxhash456');
      });

      const result = await submitSwapOrder({
        privateKey: TEST_PRIVATE_KEY,
        fromToken: USDT_CONTRACT,
        toToken: NATIVE_TOKEN,
        amount: '100',
        network: 'mainnet',
      });

      const instance = (OneInchFusion as any).mock.results[0].value;
      expect(instance.isApprovalRequired).toHaveBeenCalledOnce();
      expect(instance.setApproval).toHaveBeenCalledOnce();
      expect(result.approvalTxHash).toBe('0xapprovaltxhash456');
      expect(result.orderHash).toBe('0xorderhash1234567890');
    });
  });
});
