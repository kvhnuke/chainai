#!/usr/bin/env node

import { Command } from 'commander';
import { signMessage } from './commands/sign-message';
import { sign } from './commands/sign';
import type { Hex } from 'viem';

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

program.parseAsync(process.argv).catch((err) => {
  console.error(
    `CHAINAI_ERR: UNKNOWN — ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
