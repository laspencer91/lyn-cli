import { program } from 'commander';
import { registerSetup } from './commands/setup.js';
import { registerMine } from './commands/mine.js';
import { registerBegin } from './commands/begin.js';
import { registerFinish } from './commands/finish.js';
import { registerComments } from './commands/comments.js';
import { registerProject } from './commands/project.js';
import { registerSearch } from './commands/search.js';
import { registerStatus } from './commands/status.js';
import { registerCreate } from './commands/create.js';
import { registerLink } from './commands/link.js';
import { registerPlan } from './commands/plan.js';

program
  .name('lyn')
  .description('Linear + Git + Claude Code workflow CLI')
  .version('0.1.0');

registerSetup(program);
registerMine(program);
registerBegin(program);
registerFinish(program);
registerComments(program);
registerProject(program);
registerSearch(program);
registerStatus(program);
registerCreate(program);
registerLink(program);
registerPlan(program);

program.parse();
