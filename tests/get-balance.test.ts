import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBalance } from '../src/commands/get-balance';
import type { Hex } from 'viem';

const TEST_ADDRESS: Hex = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const NATIVE_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

// Mock getTokenBalances and createNetworkClient to avoid real API/RPC calls
vi.mock('../src/utils', async () => {
  const actual = await vi.importActual<typeof import('../src/utils')>('../src/utils');
  return {
    ...actual,
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
    createNetworkClient: vi.fn(() => ({
      getBalance: vi.fn().mockResolvedValue(BigInt('2500000000000000000')),
    })),
  };
});

describe('getBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return native ETH balance on mainnet by default', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
    });

    expect(!Array.isArray(result)).toBe(true);
    const balance = result as Awaited<ReturnType<typeof getBalance>> &
      Record<string, unknown>;
    expect(balance.address).toBe(TEST_ADDRESS);
    expect(balance.network).toBe('Ethereum');
    expect(balance.token).toBe('ETH');
    expect(balance.balance).toBe('2.5');
    expect(balance.rawBalance).toBe('2500000000000000000');
    expect(balance.decimals).toBe(18);
    expect(balance.contract).toBe(NATIVE_TOKEN_ADDRESS);
  });

  it('should return native ETH balance with explicit native token address', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      token: NATIVE_TOKEN_ADDRESS,
    });

    expect(!Array.isArray(result)).toBe(true);
    const balance = result as Awaited<ReturnType<typeof getBalance>> &
      Record<string, unknown>;
    expect(balance.token).toBe('ETH');
    expect(balance.contract).toBe(NATIVE_TOKEN_ADDRESS);
  });

  it('should accept "ethereum" as network name', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      network: 'ethereum',
    });

    expect(!Array.isArray(result)).toBe(true);
    const balance = result as Awaited<ReturnType<typeof getBalance>> &
      Record<string, unknown>;
    expect(balance.network).toBe('Ethereum');
    expect(balance.token).toBe('ETH');
  });

  it('should accept chain ID as network', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      network: '1',
    });

    expect(!Array.isArray(result)).toBe(true);
    const balance = result as Awaited<ReturnType<typeof getBalance>> &
      Record<string, unknown>;
    expect(balance.network).toBe('Ethereum');
  });

  it('should fetch ERC-20 token balance by contract address', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      token: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    });

    expect(!Array.isArray(result)).toBe(true);
    const balance = result as Awaited<ReturnType<typeof getBalance>> &
      Record<string, unknown>;
    expect(balance.token).toBe('USDT');
    expect(balance.contract).toBe('0xdac17f958d2ee523a2206206994597c13d831ec7');
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
        token: '0x0000000000000000000000000000000000000001',
      }),
    ).rejects.toThrow('not found');
  });

  it('should throw for non-address token value', async () => {
    await expect(
      getBalance({
        address: TEST_ADDRESS,
        token: 'USDT',
      }),
    ).rejects.toThrow('Token must be a valid 0x-prefixed address');
  });

  it('should return native BNB balance on BSC', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      network: 'bsc',
      token: NATIVE_TOKEN_ADDRESS,
    });

    expect(result).not.toBeInstanceOf(Array);
    const single = result as Awaited<ReturnType<typeof getBalance>> &
      Record<string, unknown>;
    expect(single.network).toBe('BNB Smart Chain');
    expect(single.token).toBe('BNB');
    expect(single.decimals).toBe(18);
    expect(single.contract).toBe(NATIVE_TOKEN_ADDRESS);
  });

  it('should return all balances when all flag is set', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      all: true,
    });

    expect(Array.isArray(result)).toBe(true);
    const balances = result as Awaited<ReturnType<typeof getBalance>> &
      unknown[];
    // 2 ERC-20 tokens from mock (native not included in --all)
    expect(balances).toHaveLength(2);
    expect(balances[0]).toMatchObject({
      token: 'USDT',
      contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    });
    expect(balances[1]).toMatchObject({
      token: 'USDC',
      contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    });
  });

  it('should return all balances on BSC when all flag is set', async () => {
    const result = await getBalance({
      address: TEST_ADDRESS,
      network: 'bsc',
      all: true,
    });

    expect(Array.isArray(result)).toBe(true);
    const balances = result as Awaited<ReturnType<typeof getBalance>> &
      unknown[];
    expect(balances[0]).toMatchObject({
      token: 'USDT',
      network: 'BNB Smart Chain',
      contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    });
  });
});
