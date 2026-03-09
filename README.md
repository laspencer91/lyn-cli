# lyn

A CLI that bridges [Linear](https://linear.app) with your local git workflow and [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Automate ticket management, branch creation, draft PRs, and give your AI coding agent direct access to your project management context.

## What it does

**`lyn begin INT-123`** — One command to start working on a ticket:
- Moves the ticket to "In Progress" in Linear
- Checks out main, pulls latest, creates a branch (`initials/INT-123-slug`)
- Pushes and creates a draft PR (GitHub or GitLab)
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
| `lyn search "query"` | Search Linear issues |
| `lyn status [ID]` | Show ticket details (auto-detects from branch) |
| `lyn comments ID` | Get ticket comments |
| `lyn project ID` | Get project info (`-d` for full description) |

## Install

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

## Agent-facing commands

Commands like `comments`, `search`, `status`, and `project` are designed to be called by Claude Code during a session. They detect whether stdout is a TTY and output plain text when piped, so the agent gets clean, parseable context.

In `begin` mode, the agent knows about read-only commands. In `plan` mode, it also has access to `create` and `link`.

## Custom prompt templates

Drop a `prompt-template.md` in `.lyn/` (in your repo or `~/.lyn/`) to inject custom context into every Claude Code session — coding standards, architecture notes, etc.

## Tech Stack

- [commander](https://github.com/tj/commander.js) + [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js) — CLI framework
- [@linear/sdk](https://github.com/linear/linear) — Linear GraphQL API
- [simple-git](https://github.com/steveukx/git-js) — Git operations
- [chalk](https://github.com/chalk/chalk) + [cli-table3](https://github.com/cli-table/cli-table3) — Terminal formatting
- [tsup](https://github.com/egoist/tsup) — Build

## License

MIT
