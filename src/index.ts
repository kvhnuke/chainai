#!/usr/bin/env node

const main = async () => {
  console.log('Hello from chainai!');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
