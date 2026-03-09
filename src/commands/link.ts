import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { ensureConfig } from '../lib/config.js';
import { getIssue, linkIssues } from '../lib/linear.js';
import { isAgent } from '../lib/format.js';
import { wrapAction } from '../lib/errors.js';

const RELATION_TYPES = ['related', 'blocks', 'duplicate', 'similar'] as const;

export function registerLink(program: Command) {
  program
    .command('link <ticketA> <ticketB>')
    .description('Link two tickets (related, blocks, duplicate, similar)')
    .option('--type <type>', 'Relation type: related, blocks, duplicate, similar')
    .action(
      wrapAction(async (ticketA: string, ticketB: string, opts) => {
        ensureConfig();
        const agent = isAgent();

        const issueA = await getIssue(ticketA);
        const issueB = await getIssue(ticketB);

        let relationType: typeof RELATION_TYPES[number];
        if (opts.type && RELATION_TYPES.includes(opts.type)) {
          relationType = opts.type;
        } else if (agent) {
          relationType = 'related';
        } else {
          relationType = await select({
            message: `How does ${issueA.identifier} relate to ${issueB.identifier}?`,
            choices: [
              { name: `${issueA.identifier} is related to ${issueB.identifier}`, value: 'related' as const },
              { name: `${issueA.identifier} blocks ${issueB.identifier}`, value: 'blocks' as const },
              { name: `${issueA.identifier} duplicates ${issueB.identifier}`, value: 'duplicate' as const },
              { name: `${issueA.identifier} is similar to ${issueB.identifier}`, value: 'similar' as const },
            ],
          });
        }

        await linkIssues(issueA.id, issueB.id, relationType);

        if (agent) {
          console.log(`Linked: ${issueA.identifier} ${relationType} ${issueB.identifier}`);
        } else {
          console.log(
            chalk.green(`\n  Linked ${chalk.bold(issueA.identifier)} ${relationType} ${chalk.bold(issueB.identifier)}\n`),
          );
        }
      }),
    );
}
