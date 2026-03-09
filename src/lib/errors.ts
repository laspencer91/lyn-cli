import chalk from 'chalk';

export class LynError extends Error {
  constructor(
    public userMessage: string,
    cause?: unknown,
  ) {
    super(userMessage, { cause });
  }
}

export function wrapAction(fn: (...args: any[]) => Promise<void>) {
  return async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (e) {
      if (e instanceof LynError) {
        console.error(chalk.red(`Error: ${e.userMessage}`));
        process.exit(1);
      }
      console.error(chalk.red('Unexpected error:'), e);
      process.exit(1);
    }
  };
}
