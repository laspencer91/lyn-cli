import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConfig } from '../lib/config.js';
import { getIssue } from '../lib/linear.js';
import { launchClaudePlan } from '../lib/claude.js';
import { wrapAction } from '../lib/errors.js';

export function registerPlan(program: Command) {
  program
    .command('plan [ticketId]')
    .description('Open Claude Code in planning mode — create tickets, file bugs, plan features')
    .action(
      wrapAction(async (ticketId: string | undefined) => {
        ensureConfig();

        if (ticketId) {
          const ticket = await getIssue(ticketId);
          console.log(chalk.dim(`\n  Planning around ${ticket.identifier}: ${ticket.title}`));
          console.log(chalk.dim('  Opening Claude Code in planning mode...\n'));
          launchClaudePlan(ticket);
        } else {
          console.log(chalk.dim('\n  Opening Claude Code in planning mode...\n'));
          launchClaudePlan();
        }
      }),
    );
}
