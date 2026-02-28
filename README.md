# chainai

A non-interactive CLI tool for Ethereum and EVM-compatible blockchain operations, designed for AI agent consumption. Supports signing, sending, broadcasting transactions, token swaps via 1inch Fusion, balance queries, and wallet generation.

## Installation

```bash
npx chainai@latest <command> [options]
```

Requires Node.js >= 18.

## Authentication

All commands that require a private key accept it via:

1. **`-k` flag**: `-k 0xYOUR_PRIVATE_KEY`
2. **Environment variable**: `export CHAINAI_PRIVATE_KEY=0xYOUR_PRIVATE_KEY`

## Supported Networks

| Network         | Chain ID | Aliases                      |
| --------------- | -------- | ---------------------------- |
| Ethereum        | 1        | `mainnet`, `ethereum`, `eth` |
| BNB Smart Chain | 56       | `bsc`, `binance`, `bnb`      |

## Commands

### `gen-wallet`

Generate a new random wallet.

```bash
npx chainai@latest gen-wallet
```

### `who-am-i`

Get the address derived from a private key.

```bash
npx chainai@latest who-am-i -k 0xYOUR_PRIVATE_KEY
```

### `sign-message`

Sign a message (EIP-191 personal sign).

```bash
npx chainai@latest sign-message -k 0xKEY -m "Hello World"
npx chainai@latest sign-message -k 0xKEY -m 0x68656c6c6f --raw   # raw hex
```

### `sign`

Sign a raw hash (secp256k1, no prefix). **Use with caution** — prefer `sign-message` in most cases.

```bash
npx chainai@latest sign -k 0xKEY -h 0xHASH
```

### `sign-typed-data`

Sign EIP-712 typed data.

```bash
npx chainai@latest sign-typed-data -k 0xKEY -d '{"domain":{...},"types":{...},"primaryType":"...","message":{...}}'
```

### `sign-transaction`

Sign a transaction (legacy, EIP-2930, or EIP-1559). Returns a serialized signed transaction.

```bash
npx chainai@latest sign-transaction -k 0xKEY -t '{"to":"0x...","value":"1000000000000000000","gasPrice":"20000000000","gas":"21000","nonce":0,"chainId":1}'
```

### `get-balance`

Get native or ERC-20 token balances.

```bash
npx chainai@latest get-balance -a 0xADDRESS                          # ETH balance
npx chainai@latest get-balance -a 0xADDRESS -n bsc                   # BNB balance
npx chainai@latest get-balance -a 0xADDRESS -t 0xTOKEN_CONTRACT      # ERC-20 balance
npx chainai@latest get-balance -a 0xADDRESS --all                    # all token balances
```

### `send`

Build and sign a transaction to send native tokens or ERC-20 tokens. Automatically fetches nonce, gas, and fee data.

```bash
npx chainai@latest send -k 0xKEY --to 0xRECIPIENT --amount 1.5 -t 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee        # send ETH
npx chainai@latest send -k 0xKEY --to 0xRECIPIENT --amount 100 -t 0xTOKEN_CONTRACT                                  # send ERC-20
npx chainai@latest send -k 0xKEY --to 0xRECIPIENT --amount 0.5 -t 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee -n bsc # send BNB
```

### `broadcast`

Broadcast a serialized signed transaction to the network.

```bash
npx chainai@latest broadcast -s 0xSERIALIZED_TX
npx chainai@latest broadcast -s 0xSERIALIZED_TX -n bsc
```

### `tx-status`

Check the status of a transaction by hash.

```bash
npx chainai@latest tx-status -h 0xTX_HASH
npx chainai@latest tx-status -h 0xTX_HASH -n bsc
```

### `swap`

Swap tokens via 1inch Fusion. Use `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` for native tokens.

```bash
npx chainai@latest swap -k 0xKEY --from-token 0xFROM --to-token 0xTO --amount 1.5         # get quote
npx chainai@latest swap -k 0xKEY --from-token 0xFROM --to-token 0xTO --amount 1.5 -y      # auto-confirm
npx chainai@latest swap -k 0xKEY --from-token 0xFROM --to-token 0xTO --amount 0.5 -n bsc  # swap on BSC
```

### `swap-order-status`

Check the status of a 1inch Fusion swap order.

```bash
npx chainai@latest swap-order-status -k 0xKEY --order-hash 0xORDER_HASH
```

## Output Format

**Success** messages are written to `stdout`:

```
CHAINAI_OK: <description>
{ ... }
```

**Error** messages are written to `stderr`:

```
CHAINAI_ERR: <ERROR_CODE> — <description>
```

Error codes: `INVALID_INPUT`, `EXECUTION_FAILED`, `TIMEOUT`, `UNKNOWN`.

## Development

```bash
yarn build          # compile to dist/
yarn dev            # run from source
yarn test           # run tests
yarn format         # format with prettier
yarn format:check   # check formatting
yarn clean          # remove dist/
```

## Agent Integration

See [agents.md](agents.md) for the complete agent skill reference, including detailed option tables, output schemas, and integration guidelines.

## License

MIT
