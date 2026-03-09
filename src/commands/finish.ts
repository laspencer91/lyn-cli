import { Command } from 'commander';
import chalk from 'chalk';
import { simpleGit } from 'simple-git';
import { ensureConfig } from '../lib/config.js';
import { getIssue, moveIssue, addComment } from '../lib/linear.js';
import { ensureGitRepo, getCurrentBranch, extractTicketId, undraftPR, getDefaultBranch } from '../lib/git.js';
import { wrapAction, LynError } from '../lib/errors.js';

export function registerFinish(program: Command) {
  program
    .command('finish [ticketId]')
    .description('Mark ticket as ready for review')
    .action(
      wrapAction(async (ticketId: string | undefined) => {
        ensureConfig();
        await ensureGitRepo();

        // Resolve ticket ID
        if (!ticketId) {
          const branch = await getCurrentBranch();
          const extracted = extractTicketId(branch);
          if (!extracted) {
            throw new LynError(
              'Could not determine ticket ID from branch name. Pass it explicitly: lyn finish INT-123',
            );
          }
          ticketId = extracted;
        }

        const ticket = await getIssue(ticketId);
        console.log(chalk.dim(`\n  Finishing ${ticket.identifier}: ${ticket.title}\n`));

        // Get commit summary
        const git = simpleGit();
        const defaultBranch = await getDefaultBranch();
        let commitSummary = '';
        try {
          const log = await git.log({ from: defaultBranch, to: 'HEAD' });
          commitSummary = log.all
            .map((c) => `- ${c.message}`)
            .join('\n');
        } catch {
          commitSummary = '(could not generate commit summary)';
        }

        // Un-draft PR
        console.log(chalk.dim('  Marking PR as ready for review...'));
        try {
          await undraftPR();
        } catch (e) {
          console.warn(chalk.yellow('  Warning: Could not un-draft PR. Do it manually.'));
        }

        // Move to In Review
        console.log(chalk.dim('  Moving ticket to In Review...'));
        await moveIssue(ticket.id, 'In Review');

        // Post comment
        console.log(chalk.dim('  Posting summary comment...'));
        await addComment(
          ticket.id,
          `Branch ready for review.\n\n**Commits:**\n${commitSummary}`,
        );

        console.log(chalk.green('\n  Done! Ticket moved to In Review.\n'));
      }),
    );
}
