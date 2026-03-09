export interface LynConfig {
  initials: string;
  defaultTeamId: string;
  defaultTeamKey: string;
  authMethod?: 'oauth' | 'api-key';
  linearApiKey?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthAccessToken?: string;
}

export interface TicketSummary {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: number;
  priorityLabel: string;
}

export interface TicketDetail extends TicketSummary {
  description: string | null;
  branchName: string | null;
  project: { name: string; description: string | null } | null;
  url: string;
  parent: {
    identifier: string;
    title: string;
    description: string | null;
    url: string;
  } | null;
}

export interface CommentSummary {
  author: string;
  body: string;
  createdAt: string;
}

export interface ForgeInfo {
  type: 'github' | 'gitlab';
  owner: string;
  repo: string;
}
