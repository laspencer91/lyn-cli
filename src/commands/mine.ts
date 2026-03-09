import { Command } from 'commander';
import { ensureConfig } from '../lib/config.js';
import { getIssues } from '../lib/linear.js';
import { formatTicketTable } from '../lib/format.js';
import { wrapAction } from '../lib/errors.js';

export function registerMine(program: Command) {
  program
    .command('mine')
    .description('List your assigned tickets')
    .option('--all', 'Show tickets from all teams')
    .option('--done', 'Include completed tickets')
    .action(
      wrapAction(async (opts) => {
        const config = ensureConfig();
        const teamId = opts.all ? undefined : config.defaultTeamId || undefined;
        const tickets = await getIssues({
          assignee: 'me',
          teamId,
          includeCompleted: opts.done,
        });
        console.log(formatTicketTable(tickets));
      }),
    );

  program
    .command('tickets')
    .description('List tickets with filters')
    .option('--unassigned', 'Show unassigned tickets')
    .option('--all', 'Show all tickets (assigned and unassigned)')
    .option('--done', 'Include completed tickets')
    .option('--limit <n>', 'Max tickets to return', '50')
    .action(
      wrapAction(async (opts) => {
        const config = ensureConfig();
        const teamId = config.defaultTeamId || undefined;

        let assignee: 'me' | 'unassigned' | 'anyone' = 'me';
        if (opts.unassigned) assignee = 'unassigned';
        if (opts.all) assignee = 'anyone';

        const tickets = await getIssues({
          assignee,
          teamId,
          includeCompleted: opts.done,
          limit: parseInt(opts.limit, 10),
        });
        console.log(formatTicketTable(tickets));
      }),
    );
}
