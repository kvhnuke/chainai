import { encodeFunctionData, isAddress, parseUnits } from 'viem';
import type { Hex } from 'viem';
import {
  NATIVE_TOKEN_ADDRESS,
  createNetworkClient,
  getNetworkConfig,
  resolveNetwork,
  validateAndCreateAccount,
} from '../utils';

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

export interface SendInput {
  privateKey: Hex;
  to: Hex;
  token: string;
  amount: string;
  network?: string;
}

export interface SendResult {
  from: string;
  to: string;
  token: string;
  amount: string;
  network: string;
  serializedTransaction: string;
}

/**
 * Builds and signs a transaction to send native tokens or ERC-20 tokens.
 *
 * - For native tokens (ETH, BNB), creates a simple value transfer.
 * - For ERC-20 tokens, encodes a `transfer(address, uint256)` call.
 *
 * Fetches nonce, gas estimate, and fee data from the network RPC.
 * Returns the serialized signed transaction ready to broadcast.
 */
export async function send(input: SendInput): Promise<SendResult> {
  const { privateKey, to, token, amount, network = 'mainnet' } = input;

  const account = validateAndCreateAccount(privateKey);

  if (!isAddress(to)) {
    throw new Error('Recipient "to" must be a valid 0x-prefixed address');
  }

  if (!isAddress(token)) {
    throw new Error(
      `Token must be a valid 0x-prefixed address. Use ${NATIVE_TOKEN_ADDRESS} for native token.`,
    );
  }

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const chain = resolveNetwork(network);
  const networkConfig = getNetworkConfig(chain);

  const client = createNetworkClient(chain, networkConfig);

  const isNative = token.toLowerCase() === NATIVE_TOKEN_ADDRESS;

  const nonce = await client.getTransactionCount({ address: account.address });
  const feeData = await client.estimateFeesPerGas();

  let txRequest: Record<string, unknown>;

  if (isNative) {
    const value = parseUnits(amount, chain.nativeCurrency.decimals);

    const gas = await client.estimateGas({
      account: account.address,
      to: to,
      value,
    });

    txRequest = {
      to,
      value,
      gas,
      nonce,
      chainId: chain.id,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    };
  } else {
    // ERC-20: read decimals then encode transfer
    const decimals = await client.readContract({
      address: token as Hex,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    const rawAmount = parseUnits(amount, decimals);

    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, rawAmount],
    });

    const gas = await client.estimateGas({
      account: account.address,
      to: token as Hex,
      data,
    });

    txRequest = {
      to: token,
      data,
      gas,
      nonce,
      chainId: chain.id,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    };
  }

  const serializedTransaction = await account.signTransaction(txRequest as any);

  return {
    from: account.address,
    to,
    token,
    amount,
    network: chain.name,
    serializedTransaction,
  };
}
