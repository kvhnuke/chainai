#!/usr/bin/env node

import { Command } from 'commander';
import * as readline from 'readline';
import { signMessage } from './commands/sign-message';
import { sign } from './commands/sign';
import { signTypedData } from './commands/sign-typed-data';
import { signTransaction } from './commands/sign-transaction';
import { getBalance } from './commands/get-balance';
import { send } from './commands/send';
import { broadcast } from './commands/broadcast';
import { whoAmI } from './commands/who-am-i';
import { txStatus } from './commands/tx-status';
import { getSwapQuote, submitSwapOrder } from './commands/swap';
import type { Hex } from 'viem';

function askYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(
        answer.trim().toLowerCase() === 'y' ||
          answer.trim().toLowerCase() === 'yes',
      );
    });
  });
}

const program = new Command();

program.name('chainai').description('chainai CLI tool').version('0.0.1');

program
  .command('sign-message')
  .description('Sign a message using a private key')
  .option(
    '-k, --private-key <key>',
    'Private key (hex string starting with 0x, or set CHAINAI_PRIVATE_KEY env var)',
  )
  .requiredOption('-m, --message <message>', 'Message to sign')
  .option('-r, --raw', 'Treat message as raw hex data')
  .action(
    async (options: {
      privateKey?: string;
      message: string;
      raw?: boolean;
    }) => {
      try {
        const privateKey =
          options.privateKey ?? process.env.CHAINAI_PRIVATE_KEY;
        if (!privateKey) {
          throw new Error(
            'Private key is required. Provide it via -k flag or CHAINAI_PRIVATE_KEY environment variable.',
          );
        }
        const result = await signMessage({
          privateKey: privateKey as Hex,
          message: options.message,
          raw: options.raw,
        });
        console.log(`CHAINAI_OK: Message signed successfully`);
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`CHAINAI_ERR: EXECUTION_FAILED — ${message}`);
        process.exit(1);
      }
    },
  );

program
  .command('sign')
  .description(
    'Sign a raw hash using a private key (secp256k1 — CRITICAL: use only when absolutely necessary)',
  )
  .option(
    '-k, --private-key <key>',
    'Private key (hex string starting with 0x, or set CHAINAI_PRIVATE_KEY env var)',
  )
  .requiredOption('-h, --hash <hash>', 'Hash to sign (0x-prefixed hex string)')
  .action(async (options: { privateKey?: string; hash: string }) => {
    try {
      const privateKey = options.privateKey ?? process.env.CHAINAI_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error(
          'Private key is required. Provide it via -k flag or CHAINAI_PRIVATE_KEY environment variable.',
        );
      }
      const result = await sign({
        privateKey: privateKey as Hex,
        hash: options.hash as Hex,
      });
      console.log(`CHAINAI_OK: Hash signed successfully`);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`CHAINAI_ERR: EXECUTION_FAILED — ${message}`);
      process.exit(1);
    }
  });

program
  .command('sign-typed-data')
  .description('Sign EIP-712 typed data using a private key')
  .option(
    '-k, --private-key <key>',
    'Private key (hex string starting with 0x, or set CHAINAI_PRIVATE_KEY env var)',
  )
  .requiredOption(
    '-d, --data <json>',
    'EIP-712 typed data as a JSON string containing domain, types, primaryType, and message',
  )
  .action(async (options: { privateKey?: string; data: string }) => {
    try {
      const privateKey = options.privateKey ?? process.env.CHAINAI_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error(
          'Private key is required. Provide it via -k flag or CHAINAI_PRIVATE_KEY environment variable.',
        );
      }

      let parsed: {
        domain: Record<string, unknown>;
        types: Record<string, { name: string; type: string }[]>;
        primaryType: string;
        message: Record<string, unknown>;
      };
      try {
        parsed = JSON.parse(options.data);
      } catch {
        throw new Error(
          'Invalid JSON provided for --data. Must be a valid JSON string with domain, types, primaryType, and message.',
        );
      }

      if (
        !parsed.domain ||
        !parsed.types ||
        !parsed.primaryType ||
        !parsed.message
      ) {
        throw new Error(
          'Data must contain domain, types, primaryType, and message fields.',
        );
      }

      const result = await signTypedData({
        privateKey: privateKey as Hex,
        domain: parsed.domain,
        types: parsed.types,
        primaryType: parsed.primaryType,
        message: parsed.message,
      });
      console.log(`CHAINAI_OK: Typed data signed successfully`);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`CHAINAI_ERR: EXECUTION_FAILED — ${message}`);
      process.exit(1);
    }
  });

program
  .command('sign-transaction')
  .description(
    'Sign a transaction using a private key (produces a serialized signed transaction ready to broadcast)',
  )
  .option(
    '-k, --private-key <key>',
    'Private key (hex string starting with 0x, or set CHAINAI_PRIVATE_KEY env var)',
  )
  .requiredOption(
    '-t, --transaction <json>',
    'Transaction object as a JSON string (e.g. {"to":"0x...","value":"0x...","chainId":1,...})',
  )
  .action(async (options: { privateKey?: string; transaction: string }) => {
    try {
      const privateKey = options.privateKey ?? process.env.CHAINAI_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error(
          'Private key is required. Provide it via -k flag or CHAINAI_PRIVATE_KEY environment variable.',
        );
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(options.transaction);
      } catch {
        throw new Error(
          'Invalid JSON provided for --transaction. Must be a valid JSON string representing a transaction object.',
        );
      }

      const result = await signTransaction({
        privateKey: privateKey as Hex,
        transaction: parsed as any,
      });
      console.log(`CHAINAI_OK: Transaction signed successfully`);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`CHAINAI_ERR: EXECUTION_FAILED — ${message}`);
      process.exit(1);
    }
  });

program
  .command('get-balance')
  .description(
    'Get the balance of a native token or ERC-20 token for a given address',
  )
  .option(
    '-a, --address <address>',
    'Wallet address (0x-prefixed hex string). Falls back to address derived from CHAINAI_PRIVATE_KEY env var.',
  )
  .option(
    '-n, --network <network>',
    'Network name or chain ID (default: mainnet)',
    'mainnet',
  )
  .option(
    '-t, --token <token>',
    'Token contract address (default: 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native token)',
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  )
  .option('--all', 'Return all token balances (native + ERC-20)')
  .action(
    async (options: {
      address?: string;
      network: string;
      token: string;
      all?: boolean;
    }) => {
      try {
        let address = options.address;
        if (!address) {
          const privateKey = process.env.CHAINAI_PRIVATE_KEY;
          if (!privateKey) {
            throw new Error(
              'Address is required. Provide it via -a flag or set CHAINAI_PRIVATE_KEY environment variable.',
            );
          }
          address = whoAmI({ privateKey: privateKey as Hex }).address;
        }
        const result = await getBalance({
          address: address as Hex,
          network: options.network,
          token: options.token,
          all: options.all,
        });
        console.log(`CHAINAI_OK: Balance retrieved successfully`);
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`CHAINAI_ERR: EXECUTION_FAILED \u2014 ${message}`);
        process.exit(1);
      }
    },
  );

program
  .command('send')
  .description(
    'Build and sign a transaction to send native tokens or ERC-20 tokens',
  )
  .option(
    '-k, --private-key <key>',
    'Private key (hex string starting with 0x, or set CHAINAI_PRIVATE_KEY env var)',
  )
  .requiredOption(
    '--to <address>',
    'Recipient address (0x-prefixed hex string)',
  )
  .requiredOption(
    '-t, --token <token>',
    'Token contract address (use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native token)',
  )
  .requiredOption(
    '--amount <amount>',
    'Amount to send in human-readable units (e.g. "1.5")',
  )
  .option(
    '-n, --network <network>',
    'Network name or chain ID (default: mainnet)',
    'mainnet',
  )
  .option(
    '-b, --broadcast',
    'Automatically broadcast the transaction after signing',
  )
  .action(
    async (options: {
      privateKey?: string;
      to: string;
      token: string;
      amount: string;
      network: string;
      broadcast?: boolean;
    }) => {
      try {
        const privateKey =
          options.privateKey ?? process.env.CHAINAI_PRIVATE_KEY;
        if (!privateKey) {
          throw new Error(
            'Private key is required. Provide it via -k flag or CHAINAI_PRIVATE_KEY environment variable.',
          );
        }
        const result = await send({
          privateKey: privateKey as Hex,
          to: options.to as Hex,
          token: options.token,
          amount: options.amount,
          network: options.network,
        });
        console.log(`CHAINAI_OK: Transaction created successfully`);
        console.log(JSON.stringify(result, null, 2));

        const shouldBroadcast =
          options.broadcast ||
          (await askYesNo('\nBroadcast this transaction? (y/N): '));
        if (shouldBroadcast) {
          const broadcastResult = await broadcast({
            serializedTransaction: result.serializedTransaction as Hex,
            network: options.network,
          });
          console.log(`CHAINAI_OK: Transaction broadcast successfully`);
          console.log(JSON.stringify(broadcastResult, null, 2));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`CHAINAI_ERR: EXECUTION_FAILED \u2014 ${message}`);
        process.exit(1);
      }
    },
  );

program
  .command('broadcast')
  .description('Broadcast a serialized signed transaction to the network')
  .requiredOption(
    '-s, --serialized-transaction <hex>',
    'Serialized signed transaction (0x-prefixed hex string)',
  )
  .option(
    '-n, --network <network>',
    'Network name or chain ID (default: mainnet)',
    'mainnet',
  )
  .action(
    async (options: { serializedTransaction: string; network: string }) => {
      try {
        const result = await broadcast({
          serializedTransaction: options.serializedTransaction as Hex,
          network: options.network,
        });
        console.log(`CHAINAI_OK: Transaction broadcast successfully`);
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`CHAINAI_ERR: EXECUTION_FAILED \u2014 ${message}`);
        process.exit(1);
      }
    },
  );

program
  .command('who-am-i')
  .description('Return the address derived from a private key')
  .option(
    '-k, --private-key <key>',
    'Private key (hex string starting with 0x, or set CHAINAI_PRIVATE_KEY env var)',
  )
  .action(async (options: { privateKey?: string }) => {
    try {
      const privateKey = options.privateKey ?? process.env.CHAINAI_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error(
          'Private key is required. Provide it via -k flag or CHAINAI_PRIVATE_KEY environment variable.',
        );
      }
      const result = whoAmI({ privateKey: privateKey as Hex });
      console.log(`CHAINAI_OK: Address retrieved successfully`);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`CHAINAI_ERR: EXECUTION_FAILED \u2014 ${message}`);
      process.exit(1);
    }
  });

program
  .command('tx-status')
  .description('Get the status of a transaction by its hash')
  .requiredOption(
    '-h, --hash <hash>',
    'Transaction hash (0x-prefixed hex string)',
  )
  .option(
    '-n, --network <network>',
    'Network name or chain ID (default: mainnet)',
    'mainnet',
  )
  .action(async (options: { hash: string; network: string }) => {
    try {
      const result = await txStatus({
        hash: options.hash as Hex,
        network: options.network,
      });
      console.log(`CHAINAI_OK: Transaction status retrieved successfully`);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`CHAINAI_ERR: EXECUTION_FAILED \u2014 ${message}`);
      process.exit(1);
    }
  });

program
  .command('swap')
  .description(
    'Swap tokens via 1inch Fusion (get quote, optionally submit order)',
  )
  .option(
    '-k, --private-key <key>',
    'Private key (hex string starting with 0x, or set CHAINAI_PRIVATE_KEY env var)',
  )
  .requiredOption(
    '--from-token <address>',
    'Source token contract address (use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native token)',
  )
  .requiredOption(
    '--to-token <address>',
    'Destination token contract address (use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native token)',
  )
  .requiredOption(
    '--amount <amount>',
    'Amount to swap in human-readable units (e.g. "1.5")',
  )
  .option(
    '-n, --network <network>',
    'Network name or chain ID (default: mainnet)',
    'mainnet',
  )
  .option(
    '-y, --yes',
    'Skip confirmation prompt and submit the order immediately',
  )
  .action(
    async (options: {
      privateKey?: string;
      fromToken: string;
      toToken: string;
      amount: string;
      network: string;
      yes?: boolean;
    }) => {
      try {
        const privateKey =
          options.privateKey ?? process.env.CHAINAI_PRIVATE_KEY;
        if (!privateKey) {
          throw new Error(
            'Private key is required. Provide it via -k flag or CHAINAI_PRIVATE_KEY environment variable.',
          );
        }

        const swapInput = {
          privateKey: privateKey as Hex,
          fromToken: options.fromToken,
          toToken: options.toToken,
          amount: options.amount,
          network: options.network,
        };

        const quoteResult = await getSwapQuote(swapInput);
        console.log(`CHAINAI_OK: Swap quote retrieved successfully`);
        console.log(JSON.stringify(quoteResult, null, 2));

        const shouldSubmit =
          options.yes || (await askYesNo('\nProceed with swap? (y/N): '));
        if (shouldSubmit) {
          const orderResult = await submitSwapOrder(swapInput);
          console.log(`CHAINAI_OK: Swap order submitted successfully`);
          console.log(JSON.stringify(orderResult, null, 2));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`CHAINAI_ERR: EXECUTION_FAILED \u2014 ${message}`);
        process.exit(1);
      }
    },
  );

program.parseAsync(process.argv).catch((err) => {
  console.error(
    `CHAINAI_ERR: UNKNOWN — ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
