import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConfig } from '../lib/config.js';
import { getIssueProject } from '../lib/linear.js';
import { isAgent } from '../lib/format.js';
import { wrapAction, LynError } from '../lib/errors.js';

export function registerProject(program: Command) {
  program
    .command('project <ticketId>')
    .description('Get project info for a ticket')
    .option('-d, --description', 'Include full project description')
    .action(
      wrapAction(async (ticketId: string, opts) => {
        ensureConfig();
        const project = await getIssueProject(ticketId);

        if (!project) {
          throw new LynError(`No project associated with ${ticketId}.`);
        }

        if (isAgent()) {
          console.log(`Project: ${project.name}`);
          if (opts.description && project.description) {
            console.log(`\n${project.description}`);
          }
        } else {
          console.log(`${chalk.bold(project.name)}`);
          if (opts.description && project.description) {
            console.log(chalk.dim('─'.repeat(40)));
            console.log(project.description);
          }
        }
      }),
    );
}
