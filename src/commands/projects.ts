import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { ensureConfig } from '../lib/config.js';
import { listProjects } from '../lib/linear.js';
import { isAgent } from '../lib/format.js';
import { wrapAction } from '../lib/errors.js';

export function registerProjects(program: Command) {
  program
    .command('projects')
    .description('List all projects')
    .action(
      wrapAction(async () => {
        ensureConfig();
        const projects = await listProjects();

        if (projects.length === 0) {
          console.log(isAgent() ? 'No projects found.' : chalk.dim('No projects found.'));
          return;
        }

        if (isAgent()) {
          for (const p of projects) {
            console.log(`${p.name} | ${p.status} | ${p.url}`);
          }
          return;
        }

        const table = new Table({
          head: [
            chalk.bold('Name'),
            chalk.bold('Status'),
            chalk.bold('Description'),
          ],
          style: { head: [], border: ['dim'] },
          colWidths: [25, 14, 50],
          wordWrap: true,
        });

        for (const p of projects) {
          table.push([
            chalk.bold.white(p.name),
            p.status,
            p.description ? p.description.slice(0, 100) + (p.description.length > 100 ? '...' : '') : chalk.dim('—'),
          ]);
        }

        console.log(table.toString());
      }),
    );
}
