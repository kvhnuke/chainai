import { describe, it, expect } from 'vitest';
import { signTransaction } from '../commands/sign-transaction';
import { privateKeyToAccount } from 'viem/accounts';
import { parseTransaction, recoverTransactionAddress } from 'viem';
import type { Hex } from 'viem';

// Well-known test private key (do NOT use in production)
const TEST_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ACCOUNT = privateKeyToAccount(TEST_PRIVATE_KEY);

describe('signTransaction', () => {
  it('should sign a legacy transaction and return the correct address', async () => {
    const result = await signTransaction({
      privateKey: TEST_PRIVATE_KEY,
      transaction: {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: BigInt('1000000000000000000'),
        gasPrice: BigInt('20000000000'),
        gas: BigInt('21000'),
        nonce: 0,
        chainId: 1,
      },
    });

    expect(result.address).toBe(TEST_ACCOUNT.address);
    expect(result.serializedTransaction).toMatch(/^0x/);
  });

  it('should produce a parseable serialized transaction', async () => {
    const result = await signTransaction({
      privateKey: TEST_PRIVATE_KEY,
      transaction: {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: BigInt('1000000000000000000'),
        gasPrice: BigInt('20000000000'),
        gas: BigInt('21000'),
        nonce: 0,
        chainId: 1,
      },
    });

    const parsed = parseTransaction(result.serializedTransaction as Hex);
    expect(parsed.to?.toLowerCase()).toBe(
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'.toLowerCase(),
    );
  });

  it('should sign an EIP-1559 transaction', async () => {
    const result = await signTransaction({
      privateKey: TEST_PRIVATE_KEY,
      transaction: {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: BigInt('1000000000000000000'),
        maxFeePerGas: BigInt('30000000000'),
        maxPriorityFeePerGas: BigInt('1000000000'),
        gas: BigInt('21000'),
        nonce: 0,
        chainId: 1,
      },
    });

    expect(result.address).toBe(TEST_ACCOUNT.address);
    expect(result.serializedTransaction).toMatch(/^0x02/); // EIP-1559 prefix
  });

  it('should produce different results for different transactions', async () => {
    const result1 = await signTransaction({
      privateKey: TEST_PRIVATE_KEY,
      transaction: {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: BigInt('1000000000000000000'),
        gasPrice: BigInt('20000000000'),
        gas: BigInt('21000'),
        nonce: 0,
        chainId: 1,
      },
    });

    const result2 = await signTransaction({
      privateKey: TEST_PRIVATE_KEY,
      transaction: {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: BigInt('2000000000000000000'),
        gasPrice: BigInt('20000000000'),
        gas: BigInt('21000'),
        nonce: 1,
        chainId: 1,
      },
    });

    expect(result1.serializedTransaction).not.toBe(
      result2.serializedTransaction,
    );
  });

  it('should throw for a private key without 0x prefix', async () => {
    await expect(
      signTransaction({
        privateKey: 'not-a-valid-key' as Hex,
        transaction: {
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          value: BigInt('1000000000000000000'),
          gasPrice: BigInt('20000000000'),
          gas: BigInt('21000'),
          nonce: 0,
          chainId: 1,
        },
      }),
    ).rejects.toThrow('Private key must be a hex string starting with 0x');
  });

  it('should throw for an invalid transaction object', async () => {
    await expect(
      signTransaction({
        privateKey: TEST_PRIVATE_KEY,
        transaction: null as any,
      }),
    ).rejects.toThrow('Transaction must be a valid transaction object');
  });

  it('should sign a contract deployment transaction (no to field)', async () => {
    const result = await signTransaction({
      privateKey: TEST_PRIVATE_KEY,
      transaction: {
        data: '0x6060604052' as Hex,
        gasPrice: BigInt('20000000000'),
        gas: BigInt('100000'),
        nonce: 0,
        chainId: 1,
      },
    });

    expect(result.address).toBe(TEST_ACCOUNT.address);
    expect(result.serializedTransaction).toMatch(/^0x/);
  });

  it('should recover the correct from address from a signed legacy transaction', async () => {
    const result = await signTransaction({
      privateKey: TEST_PRIVATE_KEY,
      transaction: {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: BigInt('1000000000000000000'),
        gasPrice: BigInt('20000000000'),
        gas: BigInt('21000'),
        nonce: 0,
        chainId: 1,
      },
    });

    const recoveredAddress = await recoverTransactionAddress({
      serializedTransaction: result.serializedTransaction as Parameters<
        typeof recoverTransactionAddress
      >[0]['serializedTransaction'],
    });

    expect(recoveredAddress.toLowerCase()).toBe(
      TEST_ACCOUNT.address.toLowerCase(),
    );
  });

  it('should recover the correct from address from a signed EIP-1559 transaction', async () => {
    const result = await signTransaction({
      privateKey: TEST_PRIVATE_KEY,
      transaction: {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: BigInt('1000000000000000000'),
        maxFeePerGas: BigInt('30000000000'),
        maxPriorityFeePerGas: BigInt('1000000000'),
        gas: BigInt('21000'),
        nonce: 0,
        chainId: 1,
      },
    });

    const recoveredAddress = await recoverTransactionAddress({
      serializedTransaction: result.serializedTransaction as Parameters<
        typeof recoverTransactionAddress
      >[0]['serializedTransaction'],
    });

    expect(recoveredAddress.toLowerCase()).toBe(
      TEST_ACCOUNT.address.toLowerCase(),
    );
  });

  it('should recover the correct from address from a contract deployment transaction', async () => {
    const result = await signTransaction({
      privateKey: TEST_PRIVATE_KEY,
      transaction: {
        data: '0x6060604052' as Hex,
        gasPrice: BigInt('20000000000'),
        gas: BigInt('100000'),
        nonce: 0,
        chainId: 1,
      },
    });

    const recoveredAddress = await recoverTransactionAddress({
      serializedTransaction: result.serializedTransaction as Parameters<
        typeof recoverTransactionAddress
      >[0]['serializedTransaction'],
    });

    expect(recoveredAddress.toLowerCase()).toBe(
      TEST_ACCOUNT.address.toLowerCase(),
    );
  });
});
