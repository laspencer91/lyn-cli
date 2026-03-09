import { Command } from 'commander';
import { ensureConfig } from '../lib/config.js';
import { getMyIssues } from '../lib/linear.js';
import { formatTicketTable } from '../lib/format.js';
import { wrapAction } from '../lib/errors.js';

export function registerMine(program: Command) {
  program
    .command('mine')
    .description('List your assigned tickets')
    .option('--all', 'Show tickets from all teams')
    .action(
      wrapAction(async (opts) => {
        const config = ensureConfig();
        const teamId = opts.all ? undefined : config.defaultTeamId || undefined;
        const tickets = await getMyIssues(teamId);
        console.log(formatTicketTable(tickets));
      }),
    );
}
