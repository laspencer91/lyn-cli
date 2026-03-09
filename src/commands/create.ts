import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { ensureConfig } from '../lib/config.js';
import { createIssue, getTeams, getIssue } from '../lib/linear.js';
import { isAgent } from '../lib/format.js';
import { wrapAction } from '../lib/errors.js';

export function registerCreate(program: Command) {
  program
    .command('create')
    .description('Create a new Linear ticket')
    .option('-t, --title <title>', 'Ticket title')
    .option('-d, --description <desc>', 'Ticket description')
    .option('--team <teamKey>', 'Team key (e.g., ENG)')
    .option('--parent <ticketId>', 'Parent ticket ID (creates sub-task)')
    .option('-p, --priority <n>', 'Priority: 0=none, 1=urgent, 2=high, 3=medium, 4=low')
    .option('--assign', 'Assign to yourself')
    .action(
      wrapAction(async (opts) => {
        const config = ensureConfig();
        const agent = isAgent();

        // Resolve title
        let title = opts.title;
        if (!title) {
          title = await input({ message: 'Ticket title:' });
        }

        // Resolve description
        let description = opts.description;
        if (!description && !agent) {
          description = await input({
            message: 'Description (optional):',
            default: '',
          });
          if (!description) description = undefined;
        }

        // Resolve team
        let teamId = config.defaultTeamId;
        if (opts.team) {
          const teams = await getTeams();
          const match = teams.find(
            (t) => t.key.toLowerCase() === opts.team.toLowerCase(),
          );
          if (match) {
            teamId = match.id;
          }
        } else if (!teamId && !agent) {
          const teams = await getTeams();
          if (teams.length === 1) {
            teamId = teams[0].id;
          } else {
            teamId = await select({
              message: 'Team:',
              choices: teams.map((t) => ({
                name: `${t.name} (${t.key})`,
                value: t.id,
              })),
            });
          }
        }

        // Resolve parent
        let parentId: string | undefined;
        if (opts.parent) {
          const parent = await getIssue(opts.parent);
          parentId = parent.id;
        }

        // Priority
        const priority = opts.priority !== undefined
          ? parseInt(opts.priority, 10)
          : undefined;

        // Assign
        const assignToSelf = opts.assign ?? false;

        const result = await createIssue({
          title,
          description,
          teamId,
          parentId,
          priority,
          assignToSelf,
        });

        if (agent) {
          console.log(`Created: ${result.identifier} | ${title} | ${result.url}`);
        } else {
          console.log(chalk.green(`\n  Created ${chalk.bold(result.identifier)}: ${title}`));
          console.log(chalk.dim(`  ${result.url}\n`));
        }
      }),
    );
}
