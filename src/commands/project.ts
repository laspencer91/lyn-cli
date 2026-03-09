import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConfig } from '../lib/config.js';
import { getIssueProject, getProjectDetail } from '../lib/linear.js';
import { isAgent, formatTicketTable } from '../lib/format.js';
import { wrapAction, LynError } from '../lib/errors.js';

export function registerProject(program: Command) {
  program
    .command('project <nameOrTicketId>')
    .description('Get project info by project name or ticket ID')
    .option('-d, --description', 'Include full project description')
    .option('--tickets', 'Show all tickets in the project')
    .action(
      wrapAction(async (nameOrTicketId: string, opts) => {
        ensureConfig();
        const agent = isAgent();

        // If it looks like a ticket ID (e.g., INT-123), get project from ticket
        const isTicketId = /^[A-Z]+-\d+$/i.test(nameOrTicketId);

        if (isTicketId && !opts.tickets) {
          // Simple lookup: get the project for this ticket
          const project = await getIssueProject(nameOrTicketId);
          if (!project) {
            throw new LynError(`No project associated with ${nameOrTicketId}.`);
          }

          if (agent) {
            console.log(`Project: ${project.name}`);
            if (opts.description && project.description) {
              console.log(`\n${project.description}`);
            }
          } else {
            console.log(chalk.bold(project.name));
            if (opts.description && project.description) {
              console.log(chalk.dim('─'.repeat(40)));
              console.log(project.description);
            }
          }
          return;
        }

        // Full project detail: by name, ID, or ticket ID with --tickets
        let projectName = nameOrTicketId;
        if (isTicketId) {
          const project = await getIssueProject(nameOrTicketId);
          if (!project) {
            throw new LynError(`No project associated with ${nameOrTicketId}.`);
          }
          projectName = project.name;
        }

        const detail = await getProjectDetail(projectName);

        if (agent) {
          console.log(`Project: ${detail.name}`);
          console.log(`Status: ${detail.status}`);
          console.log(`URL: ${detail.url}`);
          if (opts.description && detail.description) {
            console.log(`\n--- Description ---\n${detail.description}`);
          }
          if (detail.tickets.length > 0) {
            console.log(`\n--- Tickets (${detail.tickets.length}) ---`);
            console.log(formatTicketTable(detail.tickets));
          }
        } else {
          console.log(chalk.bold(detail.name));
          console.log(`${chalk.dim('Status:')}  ${detail.status}`);
          console.log(`${chalk.dim('URL:')}     ${chalk.underline(detail.url)}`);
          if (opts.description && detail.description) {
            console.log(chalk.dim('─'.repeat(50)));
            console.log(detail.description);
          }
          if (detail.tickets.length > 0) {
            console.log(chalk.dim(`\n─── Tickets (${detail.tickets.length}) ───\n`));
            console.log(formatTicketTable(detail.tickets));
          }
        }
      }),
    );
}
