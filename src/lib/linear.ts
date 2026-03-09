import { LinearClient } from '@linear/sdk';
import { getApiKey } from './secrets.js';
import { LynError } from './errors.js';
import type { TicketSummary, TicketDetail, CommentSummary } from '../types.js';

let _client: LinearClient | null = null;

export async function getClient(): Promise<LinearClient> {
  if (_client) return _client;
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new LynError('No Linear API key found. Run `lyn setup` first.');
  }
  _client = new LinearClient({ apiKey });
  return _client;
}

export async function getMe() {
  const client = await getClient();
  return client.viewer;
}

export async function getMyIssues(teamId?: string): Promise<TicketSummary[]> {
  return getIssues({ assignee: 'me', teamId });
}

export async function getIssues(opts: {
  assignee?: 'me' | 'unassigned' | 'anyone';
  teamId?: string;
  includeCompleted?: boolean;
  limit?: number;
} = {}): Promise<TicketSummary[]> {
  const client = await getClient();
  const filter: Record<string, any> = {};

  if (opts.assignee === 'me') {
    const me = await client.viewer;
    filter.assignee = { id: { eq: me.id } };
  } else if (opts.assignee === 'unassigned') {
    filter.assignee = { null: true };
  }
  // 'anyone' or undefined = no assignee filter

  if (!opts.includeCompleted) {
    filter.state = { type: { nin: ['completed', 'canceled'] } };
  }

  if (opts.teamId) {
    filter.team = { id: { eq: opts.teamId } };
  }

  const issues = await client.issues({
    filter,
    first: opts.limit ?? 50,
  });

  const results: TicketSummary[] = [];
  for (const issue of issues.nodes) {
    const state = await issue.state;
    results.push({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      status: state?.name ?? 'Unknown',
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
    });
  }
  return results;
}

export async function getIssue(identifier: string): Promise<TicketDetail> {
  const client = await getClient();

  // Search by identifier using issueSearch
  const searchResult = await client.searchIssues(identifier);
  let issue = searchResult.nodes.find(
    (i) => i.identifier.toUpperCase() === identifier.toUpperCase(),
  );

  // Broader fallback
  if (!issue && searchResult.nodes.length > 0) {
    issue = searchResult.nodes[0];
  }

  if (!issue) {
    throw new LynError(`Ticket ${identifier} not found.`);
  }

  const state = await issue.state;
  const project = await issue.project;
  const parentIssue = await issue.parent;

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description ?? null,
    status: state?.name ?? 'Unknown',
    priority: issue.priority,
    priorityLabel: issue.priorityLabel,
    branchName: issue.branchName,
    url: issue.url,
    project: project
      ? { name: project.name, description: project.description ?? null }
      : null,
    parent: parentIssue
      ? {
          identifier: parentIssue.identifier,
          title: parentIssue.title,
          description: parentIssue.description ?? null,
          url: parentIssue.url,
        }
      : null,
  };
}

export async function moveIssue(issueId: string, stateName: string): Promise<void> {
  const client = await getClient();
  const issue = await client.issue(issueId);
  const team = await issue.team;

  if (!team) {
    throw new LynError('Could not determine team for this ticket.');
  }

  const states = await team.states();
  const target = states.nodes.find(
    (s) => s.name.toLowerCase() === stateName.toLowerCase(),
  );

  if (!target) {
    const available = states.nodes.map((s) => s.name).join(', ');
    console.warn(
      `Warning: State "${stateName}" not found. Available: ${available}`,
    );
    return;
  }

  await client.updateIssue(issueId, { stateId: target.id });
}

export async function getIssueComments(
  identifier: string,
  max: number = 10,
): Promise<CommentSummary[]> {
  const detail = await getIssue(identifier);
  const client = await getClient();
  const issue = await client.issue(detail.id);
  const comments = await issue.comments({ first: max });

  const results: CommentSummary[] = [];
  for (const comment of comments.nodes) {
    const user = await comment.user;
    results.push({
      author: user?.name ?? 'Unknown',
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    });
  }
  return results;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  url: string;
}

export interface ProjectDetail extends ProjectSummary {
  tickets: TicketSummary[];
}

export async function getIssueProject(
  identifier: string,
): Promise<{ name: string; description: string | null } | null> {
  const detail = await getIssue(identifier);
  return detail.project;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const client = await getClient();
  const projects = await client.projects({ first: 50 });

  return projects.nodes.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    status: p.state,
    url: p.url,
  }));
}

export async function getProjectDetail(nameOrId: string): Promise<ProjectDetail> {
  const client = await getClient();

  // Try to find by name first (case-insensitive)
  const projects = await client.projects({ first: 100 });
  let project = projects.nodes.find(
    (p) => p.name.toLowerCase() === nameOrId.toLowerCase() || p.id === nameOrId,
  );

  if (!project) {
    throw new LynError(`Project "${nameOrId}" not found.`);
  }

  const issues = await project.issues({ first: 100 });
  const tickets: TicketSummary[] = [];
  for (const issue of issues.nodes) {
    const state = await issue.state;
    tickets.push({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      status: state?.name ?? 'Unknown',
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
    });
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    status: project.state,
    url: project.url,
    tickets,
  };
}

export async function searchIssues(query: string): Promise<TicketSummary[]> {
  const client = await getClient();
  const results = await client.searchIssues(query);

  const tickets: TicketSummary[] = [];
  for (const issue of results.nodes) {
    const state = await issue.state;
    tickets.push({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      status: state?.name ?? 'Unknown',
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
    });
  }
  return tickets;
}

export async function addComment(issueId: string, body: string): Promise<void> {
  const client = await getClient();
  await client.createComment({ issueId, body });
}

export async function createIssue(opts: {
  title: string;
  description?: string;
  teamId: string;
  parentId?: string;
  priority?: number;
  assignToSelf?: boolean;
}): Promise<{ id: string; identifier: string; url: string }> {
  const client = await getClient();

  let assigneeId: string | undefined;
  if (opts.assignToSelf) {
    const me = await client.viewer;
    assigneeId = me.id;
  }

  const result = await client.createIssue({
    title: opts.title,
    teamId: opts.teamId,
    description: opts.description,
    parentId: opts.parentId,
    priority: opts.priority,
    assigneeId,
  });
  const issue = await result.issue;
  if (!issue) {
    throw new LynError('Failed to create issue.');
  }
  return { id: issue.id, identifier: issue.identifier, url: issue.url };
}

export async function linkIssues(
  issueId: string,
  relatedIssueId: string,
  type: 'related' | 'blocks' | 'duplicate' | 'similar',
): Promise<void> {
  const client = await getClient();

  await client.createIssueRelation({
    issueId,
    relatedIssueId,
    type: type as any,
  });
}

export async function deleteIssue(issueId: string): Promise<void> {
  const client = await getClient();
  await client.deleteIssue(issueId);
}

export async function validateApiKey(apiKey: string) {
  const client = new LinearClient({ apiKey });
  try {
    const viewer = await client.viewer;
    return { valid: true, name: viewer.name, email: viewer.email };
  } catch {
    return { valid: false, name: null, email: null };
  }
}

export async function getTeams() {
  const client = await getClient();
  const teams = await client.teams();
  return teams.nodes.map((t) => ({ id: t.id, key: t.key, name: t.name }));
}
