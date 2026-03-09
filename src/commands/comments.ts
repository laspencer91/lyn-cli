import { Command } from 'commander';
import { ensureConfig } from '../lib/config.js';
import { getIssueComments } from '../lib/linear.js';
import { formatComments } from '../lib/format.js';
import { wrapAction } from '../lib/errors.js';

export function registerComments(program: Command) {
  program
    .command('comments <ticketId>')
    .description('Get comments for a ticket')
    .option('--max <n>', 'Maximum number of comments', '10')
    .action(
      wrapAction(async (ticketId: string, opts) => {
        ensureConfig();
        const comments = await getIssueComments(ticketId, parseInt(opts.max, 10));
        console.log(formatComments(comments));
      }),
    );
}
