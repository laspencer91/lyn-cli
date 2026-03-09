import { Command } from 'commander';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { ensureConfig } from '../lib/config.js';
import { getIssue, deleteIssue } from '../lib/linear.js';
import { isAgent } from '../lib/format.js';
import { wrapAction, LynError } from '../lib/errors.js';

export function registerDelete(program: Command) {
  program
    .command('delete <ticketId>')
    .description('Permanently delete a Linear ticket')
    .action(
      wrapAction(async (ticketId: string) => {
        ensureConfig();

        const ticket = await getIssue(ticketId);
        const agent = isAgent();

        if (!agent) {
          const ok = await confirm({
            message: `Permanently delete ${ticket.identifier}: ${ticket.title}?`,
            default: false,
          });
          if (!ok) {
            console.log(chalk.dim('Cancelled.'));
            return;
          }
        }

        await deleteIssue(ticket.id);

        if (agent) {
          console.log(`Deleted: ${ticket.identifier} | ${ticket.title}`);
        } else {
          console.log(chalk.green(`Deleted ${chalk.bold(ticket.identifier)}: ${ticket.title}`));
        }
      }),
    );
}
