import { describe, it, expect, vi, beforeEach } from 'vitest';
import { send } from '../src/commands/send';
import type { Hex } from 'viem';

const TEST_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_TO: Hex = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const NATIVE_TOKEN = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7';

// Mock utils to avoid real RPC calls
vi.mock('../src/utils', async () => {
  const actual = await vi.importActual<typeof import('../src/utils')>('../src/utils');
  return {
    ...actual,
    createNetworkClient: vi.fn(() => ({
      getTransactionCount: vi.fn().mockResolvedValue(5),
      estimateFeesPerGas: vi.fn().mockResolvedValue({
        maxFeePerGas: BigInt('30000000000'),
        maxPriorityFeePerGas: BigInt('1000000000'),
      }),
      estimateGas: vi.fn().mockResolvedValue(BigInt('21000')),
      readContract: vi.fn().mockResolvedValue(6), // decimals for ERC-20
    })),
  };
});

describe('send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build a native token transfer transaction', async () => {
    const result = await send({
      privateKey: TEST_PRIVATE_KEY,
      to: TEST_TO,
      token: NATIVE_TOKEN,
      amount: '1.5',
    });

    expect(result.from).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(result.to).toBe(TEST_TO);
    expect(result.token).toBe(NATIVE_TOKEN);
    expect(result.amount).toBe('1.5');
    expect(result.network).toBe('Ethereum');
    expect(result.serializedTransaction).toMatch(/^0x/);
  });

  it('should build an ERC-20 transfer transaction', async () => {
    const result = await send({
      privateKey: TEST_PRIVATE_KEY,
      to: TEST_TO,
      token: USDT_CONTRACT,
      amount: '100',
    });

    expect(result.from).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(result.to).toBe(TEST_TO);
    expect(result.token).toBe(USDT_CONTRACT);
    expect(result.amount).toBe('100');
    expect(result.network).toBe('Ethereum');
    expect(result.serializedTransaction).toMatch(/^0x/);
  });

  it('should accept a network parameter', async () => {
    const result = await send({
      privateKey: TEST_PRIVATE_KEY,
      to: TEST_TO,
      token: NATIVE_TOKEN,
      amount: '0.5',
      network: 'bsc',
    });

    expect(result.network).toBe('BNB Smart Chain');
  });

  it('should accept chain ID as network', async () => {
    const result = await send({
      privateKey: TEST_PRIVATE_KEY,
      to: TEST_TO,
      token: NATIVE_TOKEN,
      amount: '0.1',
      network: '1',
    });

    expect(result.network).toBe('Ethereum');
  });

  it('should throw for missing private key', async () => {
    await expect(
      send({
        privateKey: '' as Hex,
        to: TEST_TO,
        token: NATIVE_TOKEN,
        amount: '1',
      }),
    ).rejects.toThrow('Private key must be a hex string starting with 0x');
  });

  it('should throw for invalid recipient address', async () => {
    await expect(
      send({
        privateKey: TEST_PRIVATE_KEY,
        to: 'not-an-address' as Hex,
        token: NATIVE_TOKEN,
        amount: '1',
      }),
    ).rejects.toThrow('Recipient "to" must be a valid 0x-prefixed address');
  });

  it('should throw for invalid token address', async () => {
    await expect(
      send({
        privateKey: TEST_PRIVATE_KEY,
        to: TEST_TO,
        token: 'USDT',
        amount: '1',
      }),
    ).rejects.toThrow('Token must be a valid 0x-prefixed address');
  });

  it('should throw for invalid amount', async () => {
    await expect(
      send({
        privateKey: TEST_PRIVATE_KEY,
        to: TEST_TO,
        token: NATIVE_TOKEN,
        amount: '-5',
      }),
    ).rejects.toThrow('Amount must be a positive number');
  });

  it('should throw for zero amount', async () => {
    await expect(
      send({
        privateKey: TEST_PRIVATE_KEY,
        to: TEST_TO,
        token: NATIVE_TOKEN,
        amount: '0',
      }),
    ).rejects.toThrow('Amount must be a positive number');
  });

  it('should throw for unsupported network', async () => {
    await expect(
      send({
        privateKey: TEST_PRIVATE_KEY,
        to: TEST_TO,
        token: NATIVE_TOKEN,
        amount: '1',
        network: 'polygon',
      }),
    ).rejects.toThrow('Unsupported network');
  });
});
