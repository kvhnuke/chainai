import { type EIP712TypedData } from '@1inch/limit-order-sdk';
import { type BlockchainProviderConnector } from '@1inch/fusion-sdk';
import type { PublicClient, WalletClient } from 'viem';

export class Web3ProviderConnector implements BlockchainProviderConnector {
  constructor(
    protected readonly publicClient: PublicClient,
    protected readonly walletClient: WalletClient,
  ) {}

  async signTypedData(
    _walletAddress: string,
    typedData: EIP712TypedData,
  ): Promise<string> {
    const account = this.walletClient.account;
    if (!account) {
      throw new Error('Wallet client has no account configured');
    }
    return this.walletClient.signTypedData({
      account,
      domain: typedData.domain as any,
      types: typedData.types as any,
      primaryType: typedData.primaryType as string,
      message: typedData.message as any,
    });
  }

  async ethCall(contractAddress: string, callData: string): Promise<string> {
    return this.publicClient
      .call({
        to: contractAddress as `0x${string}`,
        data: callData as `0x${string}`,
      })
      .then((res) => res.data ?? '0x');
  }
}
