import { mainnet, bsc } from 'viem/chains';

const SUPPORTED_NETWORKS = [mainnet, bsc];

const SUPPORTED_NETWORKS_NAME_MAP: Record<
  number,
  { balances: string; nodeUrl: string }
> = {
  [mainnet.id]: {
    balances: `eth`,
    nodeUrl: `https://nodes.mewapi.io/rpc/eth`,
  },
  [bsc.id]: {
    balances: `bsc`,
    nodeUrl: `https://nodes.mewapi.io/rpc/eth`,
  },
};

export { SUPPORTED_NETWORKS, SUPPORTED_NETWORKS_NAME_MAP };
