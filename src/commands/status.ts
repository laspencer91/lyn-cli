import { Command } from 'commander';
import { ensureConfig } from '../lib/config.js';
import { getIssue } from '../lib/linear.js';
import { getCurrentBranch, extractTicketId } from '../lib/git.js';
import { formatTicketDetail } from '../lib/format.js';
import { wrapAction, LynError } from '../lib/errors.js';

export function registerStatus(program: Command) {
  program
    .command('status [ticketId]')
    .description('Show ticket details')
    .action(
      wrapAction(async (ticketId: string | undefined) => {
        ensureConfig();

        if (!ticketId) {
          try {
            const branch = await getCurrentBranch();
            const extracted = extractTicketId(branch);
            if (extracted) ticketId = extracted;
          } catch {
            // Not in a git repo, that's fine
          }

          if (!ticketId) {
            throw new LynError(
              'No ticket ID provided and could not detect one from the current branch.',
            );
          }
        }

        const ticket = await getIssue(ticketId);
        console.log(formatTicketDetail(ticket));
      }),
    );
}
