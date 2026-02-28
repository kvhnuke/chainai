# chainai — Agent Skill Reference

## Overview

`chainai` is a CLI tool distributed as an npm package. It is invoked via `npx chainai@latest`. This document defines the tool's interface, expected behaviors, and message contracts for AI agent consumption.

## Invocation

```
npx chainai@latest [options]
```

- **Runtime**: Node.js (>=18)
- **Package manager**: yarn (v4)
- **Entry point**: `dist/index.js`

## Exit Codes

| Code | Meaning                                                            |
| ---- | ------------------------------------------------------------------ |
| `0`  | Operation completed successfully.                                  |
| `1`  | Operation failed. Inspect `stderr` for a structured error message. |

## Message Contract

All output is written to `stdout` (success) or `stderr` (errors). Messages are designed for programmatic parsing by AI agents.

### Success Messages

Success messages are written to `stdout`. Agents should parse `stdout` to determine the result of the operation.

| Message                     | Meaning                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `CHAINAI_OK: <description>` | The requested operation completed successfully. `<description>` contains a brief summary of the result. |

### Error Messages

Error messages are written to `stderr` and follow a structured format:

```
CHAINAI_ERR: <ERROR_CODE> — <description>
```

| Error Code         | Description                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_INPUT`    | The provided input is malformed or missing required fields. The agent should re-validate input parameters and retry.                                           |
| `EXECUTION_FAILED` | The operation could not be completed. The description contains details on the failure cause. The agent should inspect the description and adjust its approach. |
| `TIMEOUT`          | The operation exceeded the allowed time limit. The agent should retry with a longer timeout or simplify the request.                                           |
| `UNKNOWN`          | An unexpected error occurred. The agent should report this to the orchestrator for manual inspection.                                                          |

## Agent Integration Guidelines

1. **Always use the latest version**: Invoke with `npx chainai@latest` to ensure the most recent release is used.
2. **Parse stdout for results**: Successful output is always written to `stdout`. Do not rely on exit code alone — read and parse `stdout`.
3. **Parse stderr for errors**: On non-zero exit codes, read `stderr` for a structured error message beginning with `CHAINAI_ERR:`.
4. **Retry strategy**: For `TIMEOUT` and `EXECUTION_FAILED` errors, retry up to 2 times with exponential backoff before escalating.
5. **Do not prompt for user input**: This tool is non-interactive. All required parameters must be passed as arguments or flags.
6. **Keep `agents.md` up to date**: Whenever you add, modify, or remove a command, flag, environment variable, or behavior in the codebase, you **must** update this file (`agents.md`) to reflect the change. This file is the single source of truth for agent consumers and must always match the current state of the CLI.
7. **Keep `README.md` up to date**: Whenever you add, modify, or remove a command or feature, update `README.md` to reflect the change so that human users always have accurate documentation.
8. **Keep `skills/chainai.md` up to date**: Whenever you add, modify, or remove a command, flag, or behavior, update `skills/chainai.md` to reflect the change. This is the agent skill file consumed by external AI agents and must stay in sync with the CLI.

## Development

| Command             | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `yarn build`        | Compile TypeScript source to `dist/`.           |
| `yarn dev`          | Run the CLI directly from source via `ts-node`. |
| `yarn format`       | Format all source files with Prettier.          |
| `yarn format:check` | Verify formatting without modifying files.      |
| `yarn clean`        | Remove the `dist/` directory.                   |

## Project Structure

```
src/
  index.ts        # CLI entry point (#!/usr/bin/env node)
  commands/
    sign-message.ts  # sign-message command implementation
    sign.ts          # sign command implementation (⚠️ critical)
    sign-typed-data.ts  # sign-typed-data command implementation
    sign-transaction.ts # sign-transaction command implementation
    get-balance.ts   # get-balance command implementation
    send.ts          # send command implementation
    broadcast.ts     # broadcast command implementation
    who-am-i.ts      # who-am-i command implementation
    tx-status.ts     # tx-status command implementation
    swap.ts          # swap command implementation (1inch Fusion)
    swap-order-status.ts # swap-order-status command implementation
    gen-wallet.ts    # gen-wallet command implementation
tests/
  sign-message.test.ts  # Tests for sign-message
  sign.test.ts          # Tests for sign
  sign-typed-data.test.ts  # Tests for sign-typed-data
  sign-transaction.test.ts # Tests for sign-transaction
  get-balance.test.ts   # Tests for get-balance
  send.test.ts          # Tests for send
  broadcast.test.ts     # Tests for broadcast
  who-am-i.test.ts      # Tests for who-am-i
  tx-status.test.ts     # Tests for tx-status
  swap.test.ts          # Tests for swap
  swap-order-status.test.ts # Tests for swap-order-status
  gen-wallet.test.ts    # Tests for gen-wallet
dist/             # Compiled output (generated by `yarn build`)
tsconfig.json     # TypeScript configuration
.prettierrc       # Prettier configuration
package.json      # Package manifest with bin, scripts, and metadata
agents.md         # This file — agent skill reference
```

## Commands

### `sign-message`

Sign a message using a private key (EIP-191 personal sign via viem).

```
npx chainai@latest sign-message [options]
```

#### Options

| Flag                      | Required | Description                                                                               |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `-k, --private-key <key>` | No       | Private key (hex string starting with `0x`). Falls back to `CHAINAI_PRIVATE_KEY` env var. |
| `-m, --message <message>` | Yes      | The message to sign.                                                                      |
| `-r, --raw`               | No       | Treat message as raw hex data. Message must be a valid `0x`-prefixed hex string.          |

#### Environment Variables

| Variable              | Description                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `CHAINAI_PRIVATE_KEY` | Fallback private key used when `-k` is not provided. Must be a hex string starting with `0x`. |

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Message signed successfully
{
  "address": "0x...",
  "message": "<original message>",
  "signature": "0x..."
}
```

#### Example

```bash
# Using the -k flag
npx chainai@latest sign-message -k 0xYOUR_PRIVATE_KEY -m "Hello World"

# Using the environment variable
CHAINAI_PRIVATE_KEY=0xYOUR_PRIVATE_KEY npx chainai@latest sign-message -m "Hello World"

# Signing raw hex data
npx chainai@latest sign-message -k 0xYOUR_PRIVATE_KEY -m 0x68656c6c6f --raw
```

---

### `sign`

> **⚠️ CRITICAL SECURITY WARNING — USE WITH EXTREME CAUTION ⚠️**
>
> This command signs a **raw hash** using `account.sign` (secp256k1) **without any prefix or envelope**. The resulting signature can be used to authorize **transactions, token transfers, contract interactions, approvals, or any on-chain action** — potentially **without the user's knowledge or explicit consent**.
>
> **Agents MUST only use this command when absolutely necessary.** In almost all cases, the safer `sign-message` command (EIP-191) should be used instead. If you are unsure whether you need `sign` or `sign-message`, **use `sign-message`**.
>
> Before invoking `sign`, agents **must**:
>
> 1. Verify that the hash being signed is legitimate and expected.
> 2. Confirm that no safer alternative (e.g., `sign-message`) can fulfill the requirement.
> 3. Log the justification for using raw signing.

Sign a raw hash using a private key (secp256k1 — no EIP-191 prefix).

```
npx chainai@latest sign [options]
```

#### Options

| Flag                      | Required | Description                                                                               |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `-k, --private-key <key>` | No       | Private key (hex string starting with `0x`). Falls back to `CHAINAI_PRIVATE_KEY` env var. |
| `-h, --hash <hash>`       | Yes      | The hash to sign. Must be a `0x`-prefixed hex string.                                     |

#### Environment Variables

| Variable              | Description                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `CHAINAI_PRIVATE_KEY` | Fallback private key used when `-k` is not provided. Must be a hex string starting with `0x`. |

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Hash signed successfully
{
  "address": "0x...",
  "hash": "0x...",
  "signature": "0x..."
}
```

#### Example

```bash
# Sign a keccak256 hash
npx chainai@latest sign -k 0xYOUR_PRIVATE_KEY -h 0xabcdef1234567890...

# Using the environment variable
CHAINAI_PRIVATE_KEY=0xYOUR_PRIVATE_KEY npx chainai@latest sign -h 0xabcdef1234567890...
```

---

### `sign-typed-data`

Sign EIP-712 typed data using a private key.

```
npx chainai@latest sign-typed-data [options]
```

#### Options

| Flag                      | Required | Description                                                                                     |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `-k, --private-key <key>` | No       | Private key (hex string starting with `0x`). Falls back to `CHAINAI_PRIVATE_KEY` env var.       |
| `-d, --data <json>`       | Yes      | EIP-712 typed data as a JSON string containing `domain`, `types`, `primaryType`, and `message`. |

#### Environment Variables

| Variable              | Description                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `CHAINAI_PRIVATE_KEY` | Fallback private key used when `-k` is not provided. Must be a hex string starting with `0x`. |

#### Data Format

The `--data` flag expects a JSON string with the following structure:

```json
{
  "domain": {
    "name": "AppName",
    "version": "1",
    "chainId": 1,
    "verifyingContract": "0x..."
  },
  "types": {
    "TypeName": [{ "name": "fieldName", "type": "fieldType" }]
  },
  "primaryType": "TypeName",
  "message": {
    "fieldName": "value"
  }
}
```

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Typed data signed successfully
{
  "address": "0x...",
  "signature": "0x..."
}
```

#### Example

```bash
# Sign EIP-712 typed data
npx chainai@latest sign-typed-data -k 0xYOUR_PRIVATE_KEY -d '{"domain":{"name":"TestApp","version":"1","chainId":1,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"types":{"Mail":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"contents","type":"string"}]},"primaryType":"Mail","message":{"from":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","to":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8","contents":"Hello!"}}'

# Using the environment variable
CHAINAI_PRIVATE_KEY=0xYOUR_PRIVATE_KEY npx chainai@latest sign-typed-data -d '{...}'
```

---

### `sign-transaction`

Sign a transaction using a private key. Produces a serialized signed transaction (RLP-encoded) ready to broadcast to a network.

```
npx chainai@latest sign-transaction [options]
```

#### Options

| Flag                       | Required | Description                                                                               |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `-k, --private-key <key>`  | No       | Private key (hex string starting with `0x`). Falls back to `CHAINAI_PRIVATE_KEY` env var. |
| `-t, --transaction <json>` | Yes      | Transaction object as a JSON string.                                                      |

#### Environment Variables

| Variable              | Description                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `CHAINAI_PRIVATE_KEY` | Fallback private key used when `-k` is not provided. Must be a hex string starting with `0x`. |

#### Transaction Format

The `--transaction` flag expects a JSON string. Supports legacy, EIP-2930, and EIP-1559 transaction types.

**Legacy transaction:**

```json
{
  "to": "0x...",
  "value": "1000000000000000000",
  "gasPrice": "20000000000",
  "gas": "21000",
  "nonce": 0,
  "chainId": 1,
  "data": "0x..."
}
```

**EIP-1559 transaction:**

```json
{
  "to": "0x...",
  "value": "1000000000000000000",
  "maxFeePerGas": "30000000000",
  "maxPriorityFeePerGas": "1000000000",
  "gas": "21000",
  "nonce": 0,
  "chainId": 1,
  "data": "0x..."
}
```

Note: Omit `to` for contract deployment transactions. Numeric values can be passed as strings or numbers.

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Transaction signed successfully
{
  "address": "0x...",
  "serializedTransaction": "0x..."
}
```

#### Example

```bash
# Sign a legacy transaction
npx chainai@latest sign-transaction -k 0xYOUR_PRIVATE_KEY -t '{"to":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8","value":"1000000000000000000","gasPrice":"20000000000","gas":"21000","nonce":0,"chainId":1}'

# Sign an EIP-1559 transaction
npx chainai@latest sign-transaction -k 0xYOUR_PRIVATE_KEY -t '{"to":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8","value":"1000000000000000000","maxFeePerGas":"30000000000","maxPriorityFeePerGas":"1000000000","gas":"21000","nonce":0,"chainId":1}'

# Using the environment variable
CHAINAI_PRIVATE_KEY=0xYOUR_PRIVATE_KEY npx chainai@latest sign-transaction -t '{...}'
```

---

### `get-balance`

Get the balance of a native token or ERC-20 token for a given address.

- For native tokens (ETH, BNB, etc.), fetches the balance via the node RPC using viem.
- For ERC-20 tokens, fetches the balance from the MEW balances API.

```
npx chainai@latest get-balance [options]
```

#### Options

| Flag                      | Required | Description                                                                                                                                  |
| ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `-a, --address <address>` | No       | Wallet address (`0x`-prefixed hex string). Falls back to address derived from `CHAINAI_PRIVATE_KEY` env var.                                 |
| `-n, --network <network>` | No       | Network name, alias, or chain ID. Defaults to `mainnet`. Supported: `mainnet`/`ethereum`/`eth` (1), `bsc`/`binance`/`bnb` (56).              |
| `-t, --token <token>`     | No       | Token contract address. Defaults to `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` (native token). Use the contract address for ERC-20 tokens. |
| `--all`                   | No       | Return all token balances (native + ERC-20). When set, `-t` is ignored.                                                                      |

#### Supported Networks

| Name            | Chain ID | Aliases                      | Native Token |
| --------------- | -------- | ---------------------------- | ------------ |
| Ethereum        | 1        | `mainnet`, `ethereum`, `eth` | ETH          |
| BNB Smart Chain | 56       | `bsc`, `binance`, `bnb`      | BNB          |

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Balance retrieved successfully
{
  "address": "0x...",
  "network": "Ethereum",
  "token": "ETH",
  "balance": "1.5",
  "rawBalance": "1500000000000000000",
  "decimals": 18,
  "contract": null
}
```

For ERC-20 tokens, `contract` will contain the token contract address:

```
CHAINAI_OK: Balance retrieved successfully
{
  "address": "0x...",
  "network": "Ethereum",
  "token": "USDT",
  "balance": "100.0",
  "rawBalance": "100000000",
  "decimals": 6,
  "contract": "0xdac17f958d2ee523a2206206994597c13d831ec7"
}
```

When `--all` is used, returns an array of all balances:

```
CHAINAI_OK: Balance retrieved successfully
[
  {
    "address": "0x...",
    "network": "Ethereum",
    "token": "ETH",
    "balance": "1.5",
    "rawBalance": "1500000000000000000",
    "decimals": 18,
    "contract": null
  },
  {
    "address": "0x...",
    "network": "Ethereum",
    "token": "USDT",
    "balance": "100.0",
    "rawBalance": "100000000",
    "decimals": 6,
    "contract": "0xdac17f958d2ee523a2206206994597c13d831ec7"
  }
]
```

#### Example

```bash
# Get native ETH balance on mainnet (defaults)
npx chainai@latest get-balance -a 0xYOUR_ADDRESS

# Get native token balance with explicit token address
npx chainai@latest get-balance -a 0xYOUR_ADDRESS -t 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

# Get native BNB balance on BSC
npx chainai@latest get-balance -a 0xYOUR_ADDRESS -n bsc

# Get ERC-20 token balance by contract address
npx chainai@latest get-balance -a 0xYOUR_ADDRESS -t 0xdac17f958d2ee523a2206206994597c13d831ec7

# Using chain ID as network
npx chainai@latest get-balance -a 0xYOUR_ADDRESS -n 56 -t 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

# Get all token balances
npx chainai@latest get-balance -a 0xYOUR_ADDRESS --all

# Get all token balances on BSC
npx chainai@latest get-balance -a 0xYOUR_ADDRESS -n bsc --all
```

---

### `send`

Build and sign a transaction to send native tokens or ERC-20 tokens. Fetches nonce, gas estimate, and fee data from the network RPC. Returns a serialized signed transaction ready to broadcast.

- For native tokens (ETH, BNB), creates a simple value transfer.
- For ERC-20 tokens, encodes a `transfer(address, uint256)` call. Reads token `decimals()` from the contract.

```
npx chainai@latest send [options]
```

#### Options

| Flag                      | Required | Description                                                                                                                     |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `-k, --private-key <key>` | No       | Private key (hex string starting with `0x`). Falls back to `CHAINAI_PRIVATE_KEY` env var.                                       |
| `--to <address>`          | Yes      | Recipient address (`0x`-prefixed hex string).                                                                                   |
| `-t, --token <token>`     | Yes      | Token contract address. Use `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` for native token.                                      |
| `--amount <amount>`       | Yes      | Amount to send in human-readable units (e.g. `"1.5"`). Converted using the token's decimals.                                    |
| `-n, --network <network>` | No       | Network name, alias, or chain ID. Defaults to `mainnet`. Supported: `mainnet`/`ethereum`/`eth` (1), `bsc`/`binance`/`bnb` (56). |
| `-b, --broadcast`         | No       | Automatically broadcast the transaction after signing (skips confirmation prompt).                                              |

#### Environment Variables

| Variable              | Description                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `CHAINAI_PRIVATE_KEY` | Fallback private key used when `-k` is not provided. Must be a hex string starting with `0x`. |

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Transaction created successfully
{
  "from": "0x...",
  "to": "0x...",
  "token": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "amount": "1.5",
  "network": "Ethereum",
  "serializedTransaction": "0x..."
}
```

#### Example

```bash
# Send 1.5 ETH on mainnet
npx chainai@latest send -k 0xYOUR_PRIVATE_KEY --to 0xRECIPIENT --amount 1.5 -t 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

# Send 100 USDT (ERC-20) on mainnet
npx chainai@latest send -k 0xYOUR_PRIVATE_KEY --to 0xRECIPIENT --amount 100 -t 0xdac17f958d2ee523a2206206994597c13d831ec7

# Send BNB on BSC
npx chainai@latest send -k 0xYOUR_PRIVATE_KEY --to 0xRECIPIENT --amount 0.5 -t 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee -n bsc

# Using the environment variable
CHAINAI_PRIVATE_KEY=0xYOUR_PRIVATE_KEY npx chainai@latest send --to 0xRECIPIENT --amount 1 -t 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
```

---

### `broadcast`

Broadcast a serialized signed transaction to the network. Submits the transaction via `eth_sendRawTransaction` and returns the transaction hash.

This command is typically used after `sign-transaction` or `send` to actually submit the signed transaction on-chain.

```
npx chainai@latest broadcast [options]
```

#### Options

| Flag                                 | Required | Description                                                                                                                     |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `-s, --serialized-transaction <hex>` | Yes      | Serialized signed transaction (`0x`-prefixed hex string).                                                                       |
| `-n, --network <network>`            | No       | Network name, alias, or chain ID. Defaults to `mainnet`. Supported: `mainnet`/`ethereum`/`eth` (1), `bsc`/`binance`/`bnb` (56). |

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Transaction broadcast successfully
{
  "transactionHash": "0x...",
  "network": "Ethereum",
  "explorerUrl": "https://etherscan.io/tx/0x..."
}
```

#### Example

```bash
# Broadcast a signed transaction on mainnet
npx chainai@latest broadcast -s 0xSERIALIZED_TX

# Broadcast on BSC
npx chainai@latest broadcast -s 0xSERIALIZED_TX -n bsc

# Using chain ID as network
npx chainai@latest broadcast -s 0xSERIALIZED_TX -n 56
```

---

### `who-am-i`

Return the Ethereum address derived from a private key.

```
npx chainai@latest who-am-i [options]
```

#### Options

| Flag                      | Required | Description                                                                               |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `-k, --private-key <key>` | No       | Private key (hex string starting with `0x`). Falls back to `CHAINAI_PRIVATE_KEY` env var. |

#### Environment Variables

| Variable              | Description                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `CHAINAI_PRIVATE_KEY` | Fallback private key used when `-k` is not provided. Must be a hex string starting with `0x`. |

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Address retrieved successfully
{
  "address": "0x..."
}
```

#### Example

```bash
# Using the -k flag
npx chainai@latest who-am-i -k 0xYOUR_PRIVATE_KEY

# Using the environment variable
CHAINAI_PRIVATE_KEY=0xYOUR_PRIVATE_KEY npx chainai@latest who-am-i
```

---

### `tx-status`

Get the status of a transaction by its hash. Queries the network RPC for the transaction receipt and returns the status (success, reverted, or pending) along with block and gas details.

```
npx chainai@latest tx-status [options]
```

#### Options

| Flag                      | Required | Description                                                                                                                     |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `-h, --hash <hash>`       | Yes      | Transaction hash (`0x`-prefixed, 32-byte hex string).                                                                           |
| `-n, --network <network>` | No       | Network name, alias, or chain ID. Defaults to `mainnet`. Supported: `mainnet`/`ethereum`/`eth` (1), `bsc`/`binance`/`bnb` (56). |

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Transaction status retrieved successfully
{
  "transactionHash": "0x...",
  "status": "success",
  "network": "Ethereum",
  "blockNumber": "12345678",
  "from": "0x...",
  "to": "0x...",
  "gasUsed": "21000",
  "effectiveGasPrice": "30000000000",
  "explorerUrl": "https://etherscan.io/tx/0x..."
}
```

For pending transactions (`status` is `"pending"`), `blockNumber`, `from`, `to`, `gasUsed`, and `effectiveGasPrice` will be `null`.

#### Example

```bash
# Check transaction status on mainnet
npx chainai@latest tx-status -h 0xTRANSACTION_HASH

# Check on BSC
npx chainai@latest tx-status -h 0xTRANSACTION_HASH -n bsc

# Using chain ID as network
npx chainai@latest tx-status -h 0xTRANSACTION_HASH -n 56
```

---

### `swap`

Swap tokens via 1inch Fusion. Gets a quote first, then optionally submits the swap order.

When run interactively, the command retrieves a quote and prompts the user to confirm before submitting. Use `-y` to skip the prompt and submit immediately.

```
npx chainai@latest swap [options]
```

#### Options

| Flag                      | Required | Description                                                                                                                     |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `-k, --private-key <key>` | No       | Private key (hex string starting with `0x`). Falls back to `CHAINAI_PRIVATE_KEY` env var.                                       |
| `--from-token <address>`  | Yes      | Source token contract address. Use `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` for native token.                               |
| `--to-token <address>`    | Yes      | Destination token contract address. Use `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` for native token.                          |
| `--amount <amount>`       | Yes      | Amount to swap in human-readable units (e.g. `"1.5"`). Converted using the token's decimals.                                    |
| `-n, --network <network>` | No       | Network name, alias, or chain ID. Defaults to `mainnet`. Supported: `mainnet`/`ethereum`/`eth` (1), `bsc`/`binance`/`bnb` (56). |
| `-y, --yes`               | No       | Skip confirmation prompt and submit the order immediately.                                                                      |

#### Environment Variables

| Variable              | Description                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `CHAINAI_PRIVATE_KEY` | Fallback private key used when `-k` is not provided. Must be a hex string starting with `0x`. |

#### Output (stdout)

On quote retrieval, prints:

```
CHAINAI_OK: Swap quote retrieved successfully
{
  "from": "0x...",
  "fromToken": "0x...",
  "toToken": "0x...",
  "amount": "1.5",
  "estimatedReturn": "1500",
  "estimatedReturnMin": "1400",
  "estimatedReturnAvg": "1450",
  "network": "Ethereum"
}
```

On order submission, prints:

```
CHAINAI_OK: Swap order submitted successfully
{
  "from": "0x...",
  "fromToken": "0x...",
  "toToken": "0x...",
  "amount": "1.5",
  "estimatedReturn": "1500",
  "estimatedReturnMin": "1400",
  "estimatedReturnAvg": "1450",
  "network": "Ethereum",
  "orderHash": "0x...",
  "approvalTxHash": "0x..." | null
}
```

Note: `approvalTxHash` is non-null only when an ERC-20 token approval transaction was required and sent before submitting the order. For native token swaps or when the token is already approved, this will be `null`.

#### Example

```bash
# Get a quote to swap 1 ETH for USDT on mainnet
npx chainai@latest swap -k 0xYOUR_PRIVATE_KEY --from-token 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee --to-token 0xdac17f958d2ee523a2206206994597c13d831ec7 --amount 1

# Auto-confirm the swap (skip prompt)
npx chainai@latest swap -k 0xYOUR_PRIVATE_KEY --from-token 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee --to-token 0xdac17f958d2ee523a2206206994597c13d831ec7 --amount 1 -y

# Swap on BSC
npx chainai@latest swap -k 0xYOUR_PRIVATE_KEY --from-token 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee --to-token 0x55d398326f99059fF775485246999027B3197955 --amount 0.5 -n bsc

# Using the environment variable
CHAINAI_PRIVATE_KEY=0xYOUR_PRIVATE_KEY npx chainai@latest swap --from-token 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee --to-token 0xdac17f958d2ee523a2206206994597c13d831ec7 --amount 1.5 -y
```

---

### `swap-order-status`

Get the status of a swap order by its order hash (returned from the `swap` command).

```
npx chainai@latest swap-order-status [options]
```

#### Options

| Flag                      | Required | Description                                                                                                                     |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `-k, --private-key <key>` | No       | Private key (hex string starting with `0x`). Falls back to `CHAINAI_PRIVATE_KEY` env var.                                       |
| `--order-hash <hash>`     | Yes      | Order hash returned from the `swap` command.                                                                                    |
| `-n, --network <network>` | No       | Network name, alias, or chain ID. Defaults to `mainnet`. Supported: `mainnet`/`ethereum`/`eth` (1), `bsc`/`binance`/`bnb` (56). |

#### Environment Variables

| Variable              | Description                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `CHAINAI_PRIVATE_KEY` | Fallback private key used when `-k` is not provided. Must be a hex string starting with `0x`. |

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Swap order status retrieved successfully
{
  "orderHash": "0x...",
  "status": "filled",
  "network": "Ethereum",
  "createdAt": 1700000000,
  "duration": 180,
  "fills": [{"txHash": "0x..."}],
  "cancelTx": null,
  "finalToAmount": "1500000000"
}
```

Possible `status` values: `"pending"`, `"filled"`, `"expired"`, `"cancelled"`.

For pending or cancelled orders, `finalToAmount` will be `null` and `fills` will be empty.

#### Example

```bash
# Check swap order status on mainnet
npx chainai@latest swap-order-status -k 0xYOUR_PRIVATE_KEY --order-hash 0xORDER_HASH

# Check on BSC
npx chainai@latest swap-order-status -k 0xYOUR_PRIVATE_KEY --order-hash 0xORDER_HASH -n bsc

# Using the environment variable
CHAINAI_PRIVATE_KEY=0xYOUR_PRIVATE_KEY npx chainai@latest swap-order-status --order-hash 0xORDER_HASH
```

---

### `gen-wallet`

Generate a new random wallet (private key and address). The private key is a cryptographically random 32-byte hex string. The command prints usage instructions to `stderr` explaining how to use the generated key with other commands.

```
npx chainai@latest gen-wallet
```

#### Options

This command takes no options.

#### Output (stdout)

On success, prints:

```
CHAINAI_OK: Wallet generated successfully
{
  "address": "0x...",
  "privateKey": "0x..."
}
```

Additionally, usage instructions are printed to `stderr`:

```
To use this wallet, either:
  1. Pass it via -k flag: -k 0x...
  2. Save it to your environment: export CHAINAI_PRIVATE_KEY=0x...
```

#### Example

```bash
# Generate a new wallet
npx chainai@latest gen-wallet
```
