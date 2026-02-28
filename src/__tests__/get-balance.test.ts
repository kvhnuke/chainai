import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBalance } from '../commands/get-balance';
import type { Hex } from 'viem';

const TEST_ADDRESS: Hex = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// Mock viem's createPublicClient to avoid real RPC calls
vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBalance: vi.fn().mockResolvedValue(BigInt('2500000000000000000')),
    })),
  };
});

// Mock getTokenBalances to avoid real API calls
vi.mock('../utils', () => ({
  getTokenBalances: vi.fn().mockResolvedValue([
    {
      balance: '0x56bc75e2d63100000',
      contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      decimals: 6,
      logo_url: 'https://img.mewapi.io/?image=null',
      name: 'Tether USD',
      price: 1,
      symbol: 'USDT',
    },
    {
      balance: '0xde0b6b3a7640000',
      contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      decimals: 6,
      logo_url: 'https://img.mewapi.io/?image=null',
      name: 'USD Coin',
      price: 1,
      symbol: 'USDC',
    },
  ]),
}));

describe('getBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return native ETH balance on mainnet by default', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
    });

    expect(result.address).toBe(TEST_ADDRESS);
    expect(result.network).toBe('Ethereum');
    expect(result.token).toBe('ETH');
    expect(result.balance).toBe('2.5');
    expect(result.rawBalance).toBe('2500000000000000000');
    expect(result.decimals).toBe(18);
    expect(result.contract).toBeNull();
  });

  it('should accept "ethereum" as network name', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      network: 'ethereum',
    });

    expect(result.network).toBe('Ethereum');
    expect(result.token).toBe('ETH');
  });

  it('should accept chain ID as network', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      network: '1',
    });

    expect(result.network).toBe('Ethereum');
  });

  it('should fetch ERC-20 token balance by symbol', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      token: 'USDT',
    });

    expect(result.token).toBe('USDT');
    expect(result.decimals).toBe(6);
    expect(result.contract).toBe('0xdac17f958d2ee523a2206206994597c13d831ec7');
  });

  it('should fetch ERC-20 token balance by contract address', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      token: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    });

    expect(result.token).toBe('USDT');
    expect(result.contract).toBe('0xdac17f958d2ee523a2206206994597c13d831ec7');
  });

  it('should throw for an unsupported network', async () => {
    await expect(
      getBalance({
        address: TEST_ADDRESS,
        network: 'solana',
      }),
    ).rejects.toThrow('Unsupported network');
  });

  it('should throw for an invalid address', async () => {
    await expect(
      getBalance({
        address: 'not-an-address' as Hex,
      }),
    ).rejects.toThrow('Address must be a valid 0x-prefixed hex string');
  });

  it('should throw when token is not found', async () => {
    await expect(
      getBalance({
        address: TEST_ADDRESS,
        token: 'NONEXISTENT',
      }),
    ).rejects.toThrow('Token "NONEXISTENT" not found');
  });

  it('should return native BNB balance on BSC', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      network: 'bsc',
      token: 'BNB',
    });

    expect(result.network).toBe('BNB Smart Chain');
    expect(result.token).toBe('BNB');
    expect(result.decimals).toBe(18);
    expect(result.contract).toBeNull();
  });
});
