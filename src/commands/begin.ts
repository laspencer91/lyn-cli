import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import slugifyPkg from 'slugify';
const slugify = (slugifyPkg as any).default ?? slugifyPkg;
import { ensureConfig } from '../lib/config.js';
import { getMyIssues, getIssue, moveIssue, addComment } from '../lib/linear.js';
import {
  ensureGitRepo,
  ensureClean,
  getDefaultBranch,
  pullLatest,
  createAndPush,
  createDraftPR,
  branchExists,
} from '../lib/git.js';
import { launchClaude } from '../lib/claude.js';
import { wrapAction, LynError } from '../lib/errors.js';

export function registerBegin(program: Command) {
  program
    .command('begin [ticketId]')
    .description('Start working on a ticket')
    .option('--no-claude', 'Skip launching Claude Code')
    .action(
      wrapAction(async (ticketId: string | undefined, opts) => {
        const config = ensureConfig();

        // Step 1: Resolve ticket
        if (!ticketId) {
          const tickets = await getMyIssues(config.defaultTeamId || undefined);
          if (tickets.length === 0) {
            throw new LynError('No assigned tickets found.');
          }

          ticketId = await select({
            message: 'Select a ticket to begin:',
            choices: tickets.map((t) => ({
              name: `${t.identifier}  ${t.title}  ${chalk.dim(`[${t.status}]`)}`,
              value: t.identifier,
            })),
          });
        }

        console.log(chalk.dim(`\n  Starting work on ${ticketId}...\n`));

        // Step 2: Fetch ticket detail
        const ticket = await getIssue(ticketId);

        // Step 3: Git checks
        await ensureGitRepo();
        await ensureClean();

        // Step 4: Checkout default branch and pull
        const defaultBranch = await getDefaultBranch();
        console.log(chalk.dim(`  Switching to ${defaultBranch} and pulling latest...`));
        await pullLatest(defaultBranch);

        // Step 5: Create branch
        const slug = slugify(ticket.title, {
          lower: true,
          strict: true,
        }).slice(0, 50);
        const branchName = `${config.initials}/${ticket.identifier}-${slug}`;

        if (await branchExists(branchName)) {
          throw new LynError(
            `Branch ${branchName} already exists. Check it out manually or delete it first.`,
          );
        }

        console.log(chalk.dim(`  Creating branch ${branchName}...`));
        await createAndPush(branchName, ticket.identifier);

        // Step 6: Move ticket to In Progress
        console.log(chalk.dim('  Moving ticket to In Progress...'));
        await moveIssue(ticket.id, 'In Progress');

        // Step 7: Create draft PR
        console.log(chalk.dim('  Creating draft PR...'));
        let prUrl: string | null = null;
        try {
          prUrl = await createDraftPR(
            `${ticket.identifier}: ${ticket.title}`,
            `Resolves ${ticket.identifier}\n\n${ticket.url}`,
            defaultBranch,
          );
          if (prUrl) {
            console.log(chalk.dim(`  PR: ${prUrl}`));
          }
        } catch (e) {
          console.warn(
            chalk.yellow('  Warning: Could not create draft PR. You may need to create it manually.'),
          );
        }

        // Step 8: Post comment on Linear ticket
        const commentLines = [`Started work on branch \`${branchName}\``];
        if (prUrl) commentLines.push(`PR: ${prUrl}`);
        await addComment(ticket.id, commentLines.join('\n'));

        // Step 9: Summary
        console.log(chalk.green('\n  Ready to work!\n'));
        console.log(`  ${chalk.bold(ticket.identifier)} ${ticket.title}`);
        console.log(`  ${chalk.dim('Branch:')} ${branchName}`);
        console.log(`  ${chalk.dim('Status:')} In Progress`);

        // Step 9: Launch Claude Code
        if (opts.claude !== false) {
          console.log(chalk.dim('\n  Launching Claude Code...\n'));
          launchClaude(ticket);
        }
      }),
    );
}
