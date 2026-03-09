import { Command } from 'commander';
import { ensureConfig } from '../lib/config.js';
import { searchIssues } from '../lib/linear.js';
import { formatTicketTable } from '../lib/format.js';
import { wrapAction } from '../lib/errors.js';

export function registerSearch(program: Command) {
  program
    .command('search <query>')
    .description('Search Linear issues')
    .action(
      wrapAction(async (query: string) => {
        ensureConfig();
        const tickets = await searchIssues(query);
        console.log(formatTicketTable(tickets));
      }),
    );
}
