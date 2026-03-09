# lyn

A CLI that bridges [Linear](https://linear.app) with your local git workflow and [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Automate ticket management, branch creation, draft PRs, and give your AI coding agent direct access to your project management context.

## Install

```bash
npm install -g lyn-linear
```

Or from source:

```bash
git clone https://github.com/laspencer91/lyn-cli.git
cd lyn-cli
npm install
npm run build
npm link
```

## Setup

### OAuth (recommended)

1. Go to [Linear API Settings](https://linear.app/settings/api/applications/new)
2. Create an OAuth application with callback URL: `http://localhost:3847/callback`
3. Run `lyn setup` and enter your Client ID and Secret

### API Key

```bash
lyn setup --api-key
```

Grab a personal API key from [Linear API Settings](https://linear.app/settings/api).

## What it does

**`lyn begin INT-123`** — One command to start working on a ticket:
- Moves the ticket to "In Progress" in Linear
- Checks out main, pulls latest, creates a branch (`initials/INT-123-slug`)
- Pushes and creates a draft PR (GitHub or GitLab)
- Posts the branch name and PR link as a comment on the Linear ticket
- Opens Claude Code with the ticket's full context injected — title, description, parent task context (for sub-issues), and project info

**`lyn plan`** — Opens Claude Code as a product planning agent:
- Create tickets, file bugs, plan features, link related work
- The agent searches for duplicates, sets priorities, and organizes sub-tasks
- Optionally focus on a specific ticket: `lyn plan INT-123`

**`lyn finish`** — Close the loop:
- Marks the PR as ready for review
- Moves the ticket to "In Review"
- Posts a commit summary on the Linear ticket

## All Commands

| Command | Description |
|---|---|
| `lyn setup` | Connect to Linear via OAuth (or `--api-key` for personal tokens) |
| `lyn mine` | List your assigned tickets |
| `lyn begin [ID]` | Start working — branch, PR, Claude Code with context |
| `lyn finish [ID]` | Mark ready for review, un-draft PR, update Linear |
| `lyn plan [ID]` | Open Claude Code in planning mode |
| `lyn create` | Create a new ticket (`-t`, `-d`, `--parent`, `-p`, `--assign`) |
| `lyn link A B` | Link two tickets (`--type related\|blocks\|duplicate\|similar`) |
| `lyn delete ID` | Delete a ticket |
| `lyn search "query"` | Search Linear issues |
| `lyn status [ID]` | Show ticket details (auto-detects from branch) |
| `lyn comments ID` | Get ticket comments (`--max=N`) |
| `lyn projects` | List all projects |
| `lyn project NAME` | Get project info (`-d` for description, `--tickets` for all tickets) |
| `lyn project INT-123` | Get the project associated with a ticket |

## How `begin` works

```
$ lyn begin

? Select a ticket to begin:
  INT-89  Fix auth token refresh  [Todo]
> INT-92  Add dark mode toggle    [Todo]
  INT-95  Update onboarding flow  [In Progress]

  Starting work on INT-92...

  Switching to main and pulling latest...
  Creating branch las/INT-92-add-dark-mode-toggle...
  Moving ticket to In Progress...
  Creating draft PR...
  PR: https://github.com/org/repo/pull/47

  Ready to work!

  INT-92 Add dark mode toggle
  Branch: las/INT-92-add-dark-mode-toggle
  Status: In Progress

  Launching Claude Code...
```

Claude Code receives the full ticket context — and for sub-issues, it also gets the parent ticket's description so the agent understands the broader goal.

## Sub-issue support

When `lyn begin` detects a sub-issue, the Claude Code session receives both:
- The **parent ticket** context (title, description) for the big picture
- The **sub-task** context so the agent focuses on the specific piece of work

## Two modes of Claude Code integration

### `begin` mode (coding)
The agent gets read-only Linear commands: `comments`, `search`, `status`, `project`, and `finish` to close the loop when done.

### `plan` mode (planning)
The agent gets full Linear access: `create`, `link`, `search`, `mine`, `status`, `comments`, `project`. It can create tickets, file bugs, link related work, and organize the backlog.

## Agent-facing output

Commands like `comments`, `search`, `status`, and `project` detect whether stdout is a TTY. In a terminal, you get colored tables. When piped or called by an agent, you get clean plain text. Set `LYN_PLAIN=1` to force plain output.

## Custom prompt templates

Drop a `prompt-template.md` in `.lyn/` (in your repo or `~/.lyn/`) to inject custom context into every Claude Code session — coding standards, architecture notes, repo conventions, etc.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed (`npm install -g @anthropic-ai/claude-code`)
- [gh](https://cli.github.com/) (GitHub) or [glab](https://gitlab.com/gitlab-org/cli) (GitLab) for PR creation
- A [Linear](https://linear.app) account

## Tech Stack

- [commander](https://github.com/tj/commander.js) + [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js) — CLI framework
- [@linear/sdk](https://github.com/linear/linear) — Linear GraphQL API
- [simple-git](https://github.com/steveukx/git-js) — Git operations
- [chalk](https://github.com/chalk/chalk) + [cli-table3](https://github.com/cli-table/cli-table3) — Terminal formatting
- [tsup](https://github.com/egoist/tsup) — Build

## License

MIT
