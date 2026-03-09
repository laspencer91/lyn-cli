import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { TicketDetail } from '../types.js';

function loadCustomTemplate(): string | null {
  const templatePaths = [
    join(process.cwd(), '.lyn', 'prompt-template.md'),
    join(homedir(), '.lyn', 'prompt-template.md'),
  ];

  for (const templatePath of templatePaths) {
    if (existsSync(templatePath)) {
      return readFileSync(templatePath, 'utf-8');
    }
  }
  return null;
}

function buildBeginPrompt(ticket: TicketDetail): string {
  const parts: string[] = [];

  if (ticket.parent) {
    parts.push(`# Parent Task: ${ticket.parent.identifier} — ${ticket.parent.title}`);
    parts.push('');
    if (ticket.parent.description) {
      parts.push('## Parent Description');
      parts.push(ticket.parent.description);
      parts.push('');
    }
    parts.push(`# Sub-task: ${ticket.identifier} — ${ticket.title}`);
    parts.push(`This is a sub-task of ${ticket.parent.identifier}. Focus on this specific piece of work.`);
  } else {
    parts.push(`# Current Task: ${ticket.identifier} — ${ticket.title}`);
  }
  parts.push('');

  if (ticket.description) {
    parts.push('## Ticket Description');
    parts.push(ticket.description);
    parts.push('');
  }

  if (ticket.project) {
    parts.push(`## Project: ${ticket.project.name}`);
    if (ticket.project.description) {
      parts.push(ticket.project.description);
    }
    parts.push('');
  }

  parts.push('## Available lyn Commands');
  parts.push('You have access to these CLI commands for additional context:');
  parts.push('');
  parts.push(`- \`lyn comments ${ticket.identifier} --max=5\` — Get recent comments on this ticket`);
  parts.push(`- \`lyn project ${ticket.identifier} -d\` — Get project description for context`);
  parts.push('- `lyn search "query"` — Search Linear issues for related tickets');
  parts.push(`- \`lyn status ${ticket.identifier}\` — Check current ticket status`);
  parts.push(`- \`lyn finish ${ticket.identifier}\` — When work is complete: marks PR ready, moves ticket to review`);
  parts.push('');
  parts.push('Use these commands via the Bash tool when you need more context about the task.');

  const custom = loadCustomTemplate();
  if (custom) {
    parts.push('');
    parts.push('## Custom Context');
    parts.push(custom);
  }

  return parts.join('\n');
}

function buildPlanPrompt(ticket: TicketDetail): string {
  const parts: string[] = [];

  parts.push(`# Planning: ${ticket.identifier} — ${ticket.title}`);
  parts.push('');
  parts.push('You are in **planning mode**. Your job is to help break down this ticket, create sub-tasks, link related issues, and organize work — NOT to write code.');
  parts.push('');

  if (ticket.description) {
    parts.push('## Ticket Description');
    parts.push(ticket.description);
    parts.push('');
  }

  if (ticket.project) {
    parts.push(`## Project: ${ticket.project.name}`);
    if (ticket.project.description) {
      parts.push(ticket.project.description);
    }
    parts.push('');
  }

  parts.push('## Available lyn Commands');
  parts.push('You have full access to Linear via these CLI commands:');
  parts.push('');
  parts.push(`- \`lyn create -t "Title" -d "Description" --parent ${ticket.identifier} --assign\` — Create a sub-task under this ticket`);
  parts.push('- `lyn create -t "Title" -d "Description" -p 2` — Create a standalone ticket (priority: 1=urgent, 2=high, 3=medium, 4=low)');
  parts.push(`- \`lyn link ${ticket.identifier} OTHER-123 --type related\` — Link tickets (types: related, blocks, duplicate, similar)`);
  parts.push('- `lyn search "query"` — Search Linear issues for related or duplicate tickets');
  parts.push(`- \`lyn comments ${ticket.identifier} --max=5\` — Get recent comments on this ticket`);
  parts.push(`- \`lyn project ${ticket.identifier} -d\` — Get project description for context`);
  parts.push(`- \`lyn status ${ticket.identifier}\` — Check current ticket status`);
  parts.push(`- \`lyn mine\` — List all your currently assigned tickets`);
  parts.push('');
  parts.push('Use these commands via the Bash tool. Start by understanding the ticket fully, then propose a plan before creating any tickets. Ask for confirmation before creating tickets.');

  const custom = loadCustomTemplate();
  if (custom) {
    parts.push('');
    parts.push('## Custom Context');
    parts.push(custom);
  }

  return parts.join('\n');
}

function spawnClaude(systemPrompt: string): void {
  const args = [
    '--dangerously-skip-permissions',
    '--append-system-prompt',
    systemPrompt,
  ];

  const child = spawn('claude', args, {
    stdio: 'inherit',
    env: { ...process.env },
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

export function launchClaude(ticket: TicketDetail): void {
  spawnClaude(buildBeginPrompt(ticket));
}

function buildOpenPlanPrompt(): string {
  const parts: string[] = [];

  parts.push('# Linear Planning Mode');
  parts.push('');
  parts.push('You are a **product planning agent**. You can create tickets, file bugs, plan features, link related work, and organize the backlog in Linear.');
  parts.push('');
  parts.push('Start by asking the user what they want to plan, or they may describe it directly. Discuss the approach before creating anything. Always confirm before creating tickets.');
  parts.push('');
  parts.push('## Available lyn Commands');
  parts.push('You have full access to Linear via these CLI commands:');
  parts.push('');
  parts.push('- `lyn create -t "Title" -d "Description" -p 2` — Create a ticket (priority: 1=urgent, 2=high, 3=medium, 4=low)');
  parts.push('- `lyn create -t "Title" -d "Description" --parent INT-123 --assign` — Create a sub-task under a parent ticket');
  parts.push('- `lyn link INT-123 INT-456 --type related` — Link tickets (types: related, blocks, duplicate, similar)');
  parts.push('- `lyn search "query"` — Search Linear issues to find related or duplicate tickets');
  parts.push('- `lyn mine` — List currently assigned tickets');
  parts.push('- `lyn status INT-123` — Get full details on a ticket');
  parts.push('- `lyn comments INT-123 --max=5` — Get comments on a ticket');
  parts.push('- `lyn project INT-123 -d` — Get project description for a ticket');
  parts.push('');
  parts.push('## Guidelines');
  parts.push('- Search for existing/duplicate tickets before creating new ones');
  parts.push('- Write clear, actionable ticket titles');
  parts.push('- Include acceptance criteria in descriptions when relevant');
  parts.push('- Set appropriate priority levels');
  parts.push('- Link related tickets to maintain traceability');
  parts.push('- For large features, break into sub-tasks under a parent ticket');

  const custom = loadCustomTemplate();
  if (custom) {
    parts.push('');
    parts.push('## Custom Context');
    parts.push(custom);
  }

  return parts.join('\n');
}

export function launchClaudePlan(ticket?: TicketDetail): void {
  if (ticket) {
    spawnClaude(buildPlanPrompt(ticket));
  } else {
    spawnClaude(buildOpenPlanPrompt());
  }
}
