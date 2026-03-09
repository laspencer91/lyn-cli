import chalk from 'chalk';
import Table from 'cli-table3';
import type { TicketSummary, TicketDetail, CommentSummary } from '../types.js';

export function isAgent(): boolean {
  return !process.stdout.isTTY || process.env.LYN_PLAIN === '1';
}

const PRIORITY_COLORS: Record<number, (s: string) => string> = {
  0: chalk.gray,   // No priority
  1: chalk.red,    // Urgent
  2: chalk.yellow, // High
  3: chalk.blue,   // Medium
  4: chalk.gray,   // Low
};

function colorPriority(priority: number, label: string): string {
  const colorFn = PRIORITY_COLORS[priority] ?? chalk.white;
  return colorFn(label);
}

const STATUS_COLORS: Record<string, (s: string) => string> = {
  'in progress': chalk.cyan,
  'todo': chalk.yellow,
  'in review': chalk.magenta,
  'done': chalk.green,
  'backlog': chalk.gray,
};

function colorStatus(status: string): string {
  const key = status.toLowerCase();
  const colorFn = Object.entries(STATUS_COLORS).find(([k]) => key.includes(k))?.[1] ?? chalk.white;
  return colorFn(status);
}

export function formatTicketTable(tickets: TicketSummary[]): string {
  if (tickets.length === 0) return isAgent() ? 'No tickets found.' : chalk.dim('No tickets found.');

  if (isAgent()) {
    return tickets
      .map((t) => `${t.identifier} | ${t.status} | ${t.priorityLabel} | ${t.title}`)
      .join('\n');
  }

  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Status'),
      chalk.bold('Priority'),
      chalk.bold('Title'),
    ],
    style: { head: [], border: ['dim'] },
    colWidths: [12, 16, 12, 60],
    wordWrap: true,
  });

  for (const t of tickets) {
    table.push([
      chalk.bold.white(t.identifier),
      colorStatus(t.status),
      colorPriority(t.priority, t.priorityLabel),
      t.title,
    ]);
  }

  return table.toString();
}

export function formatTicketDetail(ticket: TicketDetail): string {
  if (isAgent()) {
    const lines = [
      `Ticket: ${ticket.identifier}`,
      `Title: ${ticket.title}`,
      `Status: ${ticket.status}`,
      `Priority: ${ticket.priorityLabel}`,
      `URL: ${ticket.url}`,
    ];
    if (ticket.branchName) lines.push(`Branch: ${ticket.branchName}`);
    if (ticket.project) lines.push(`Project: ${ticket.project.name}`);
    if (ticket.description) {
      lines.push('', '--- Description ---', ticket.description);
    }
    return lines.join('\n');
  }

  const lines = [
    `${chalk.bold.white(ticket.identifier)} ${chalk.bold(ticket.title)}`,
    `${chalk.dim('Status:')}  ${colorStatus(ticket.status)}`,
    `${chalk.dim('Priority:')} ${colorPriority(ticket.priority, ticket.priorityLabel)}`,
    `${chalk.dim('URL:')}     ${chalk.underline(ticket.url)}`,
  ];
  if (ticket.branchName) lines.push(`${chalk.dim('Branch:')}  ${ticket.branchName}`);
  if (ticket.project) lines.push(`${chalk.dim('Project:')} ${ticket.project.name}`);
  if (ticket.description) {
    lines.push('', chalk.dim('─'.repeat(60)), ticket.description);
  }
  return lines.join('\n');
}

export function formatComments(comments: CommentSummary[]): string {
  if (comments.length === 0) return isAgent() ? 'No comments.' : chalk.dim('No comments.');

  if (isAgent()) {
    return comments
      .map((c) => `[${c.author}] (${c.createdAt}):\n${c.body}`)
      .join('\n---\n');
  }

  return comments
    .map(
      (c) =>
        `${chalk.bold(c.author)} ${chalk.dim(c.createdAt)}\n${c.body}`,
    )
    .join(`\n${chalk.dim('─'.repeat(40))}\n`);
}
