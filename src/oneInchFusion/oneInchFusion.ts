import {
  Address,
  FusionSDK,
  NativeOrdersFactory,
  NetworkEnum,
  type OrderParams,
  type QuoteParams,
} from '@1inch/fusion-sdk';
import type {
  OrderStatusOutputType,
  QuoteInputType,
  QuoteOutputType,
} from './oneInchTypes';
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  http,
  type WalletClient,
  type PublicClient,
  type Chain,
  type Hex,
  encodeFunctionData,
} from 'viem';
import { Account, privateKeyToAccount } from 'viem/accounts';
import { ONEINCH_APPROVAL_ADDRESS } from './configs';
import { bsc, mainnet } from 'viem/chains';
import { Web3ProviderConnector } from './oneInchProvider';
import type { AxiosError } from 'axios';
import { NATIVE_TOKEN_ADDRESS } from '../utils';

const getFusionParams = (config: QuoteInputType): QuoteParams | OrderParams => {
  const { fromTokenAddress, toTokenAddress, amount, fromAddress } = config;
  return {
    amount,
    fromTokenAddress,
    toTokenAddress,
    enableEstimate: false,
    source: 'chainai',
    walletAddress: fromAddress as string,
    isPermit2: false,
  };
};

class OneInchFusion {
  private web3Provider: Web3ProviderConnector;
  private sdk: FusionSDK;
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  private chain: Chain;
  private account: Account;
  constructor(nodeUrl: string, privateKey: Hex, chainId: number) {
    const account = privateKeyToAccount(privateKey);
    this.account = account;
    this.chain = chainId === 1 ? mainnet : bsc;
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(nodeUrl),
    });
    this.walletClient = createWalletClient({
      account,
      chain: this.chain,
      transport: http(nodeUrl),
    });
    this.web3Provider = new Web3ProviderConnector(
      this.publicClient,
      this.walletClient,
    );
    this.sdk = new FusionSDK({
      network: chainId === 1 ? NetworkEnum.ETHEREUM : NetworkEnum.BINANCE,
      url: 'https://fusion.1inch.io',
      blockchainProvider: this.web3Provider,
    });
  }

  async getOrderStatus(hash: string): Promise<OrderStatusOutputType> {
    return this.sdk.getOrderStatus(hash).then((res) => {
      let status = res.status as string;
      if (status === 'fulfilled') status = 'filled';
      const creationDate = Math.floor(new Date(res.createdAt).getTime() / 1000);
      const retValue: OrderStatusOutputType = {
        status,
        cancelTx: res.cancelTx,
        createdAt: creationDate,
        duration: res.auctionDuration,
        fills: res.fills,
      };
      if (status === 'filled') {
        retValue.finalToAmount = BigInt(res.fills[0]!.filledAuctionTakerAmount);
      }
      return retValue;
    });
  }

  async getQuote(config: QuoteInputType): Promise<QuoteOutputType> {
    try {
      const quote = await this.sdk.getQuote(getFusionParams(config));
      return {
        startAmount: quote.presets[quote.recommendedPreset]!.auctionStartAmount,
        endAmount: quote.presets[quote.recommendedPreset]!.auctionEndAmount,
        avgAmount:
          (quote.presets[quote.recommendedPreset]!.auctionStartAmount +
            quote.presets[quote.recommendedPreset]!.auctionEndAmount) /
          2n,
      };
    } catch (e: unknown) {
      const response =
        ((e as AxiosError).response?.data as { description: string })
          ?.description || null;
      throw new Error(
        response || (e as Error).message || 'Failed to fetch quote from 1inch',
      );
    }
  }

  async submitOrder(config: QuoteInputType) {
    try {
      const preparedOrder = await this.sdk.createOrder(
        getFusionParams(config) as OrderParams,
      );
      if (config.fromTokenAddress !== NATIVE_TOKEN_ADDRESS) {
        const info = await this.sdk.submitOrder(
          preparedOrder.order,
          preparedOrder.quoteId,
        );
        return {
          hash: info.orderHash,
        };
      } else {
        const info = await this.sdk.submitNativeOrder(
          preparedOrder.order,
          new Address(config.fromAddress),
          preparedOrder.quoteId,
        );
        const factory = NativeOrdersFactory.default(
          this.chain.id === 1 ? NetworkEnum.ETHEREUM : NetworkEnum.BINANCE,
        );
        const call = factory.create(
          new Address(config.fromAddress),
          preparedOrder.order.build(),
        );
        const tx = {
          data: call.data as `0x${string}`,
          to: call.to.toString() as `0x${string}`,
          account: config.fromAddress as `0x${string}`,
          value: call.value,
          chain: this.chain,
        };
        const fullTx = await this.publicClient.prepareTransactionRequest(tx);
        const signedTx = await this.account.signTransaction!(fullTx as any);
        const hash = await this.publicClient.sendRawTransaction({
          serializedTransaction: signedTx,
        });
        return this.publicClient
          .waitForTransactionReceipt({ hash })
          .then((res) => {
            if (res.status === 'success')
              return {
                hash: info.orderHash,
              };
            else throw new Error('Native Transaction Failed');
          });
      }
    } catch (e: unknown) {
      throw new Error(
        (e as Error).message || 'Failed to submit order to 1inch',
      );
    }
  }

  async isApprovalRequired(
    fromAddress: string,
    tokenAddress: string,
    amount: bigint,
  ): Promise<boolean> {
    if (tokenAddress === NATIVE_TOKEN_ADDRESS) return false;
    const tokeAllowanceData = (await this.publicClient.readContract({
      abi: erc20Abi,
      address: tokenAddress as `0x${string}`,
      functionName: 'allowance',
      args: [fromAddress as `0x${string}`, ONEINCH_APPROVAL_ADDRESS],
    })) as bigint;
    if (tokeAllowanceData < amount) return true;
    return false;
  }

  async setApproval(fromAddress: string, tokenAddress: string) {
    const tx = {
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [
          ONEINCH_APPROVAL_ADDRESS,
          BigInt(
            '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          ),
        ],
      }) as `0x${string}`,
      to: tokenAddress as `0x${string}`,
      account: fromAddress as `0x${string}`,
      chain: this.chain,
    };

    const fullTx = await this.publicClient.prepareTransactionRequest(tx);
    const signedTx = await this.account.signTransaction!(fullTx as any);
    const hash = await this.publicClient.sendRawTransaction({
      serializedTransaction: signedTx,
    });
    return this.publicClient.waitForTransactionReceipt({ hash }).then((res) => {
      return res.transactionHash;
    });
  }
}

export default OneInchFusion;
