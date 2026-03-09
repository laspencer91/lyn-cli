import { simpleGit } from 'simple-git';
import { execSync, exec } from 'node:child_process';
import { LynError } from './errors.js';
import type { ForgeInfo } from '../types.js';

const git = simpleGit();

export async function ensureGitRepo(): Promise<void> {
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new LynError(
      'Not a git repository. Navigate to your project directory first.',
    );
  }
}

export async function ensureClean(): Promise<void> {
  const status = await git.status();
  if (!status.isClean()) {
    throw new LynError(
      'Working directory has uncommitted changes. Run `git stash` or commit first.',
    );
  }
}

export async function getDefaultBranch(): Promise<string> {
  try {
    const result = await git.raw(['symbolic-ref', 'refs/remotes/origin/HEAD']);
    return result.trim().replace('refs/remotes/origin/', '');
  } catch {
    // Fallback: check if main or master exists
    const branches = await git.branchLocal();
    if (branches.all.includes('main')) return 'main';
    if (branches.all.includes('master')) return 'master';
    return 'main';
  }
}

export async function pullLatest(branch: string): Promise<void> {
  await git.checkout(branch);
  await git.pull('origin', branch);
}

export async function createAndPush(branchName: string): Promise<void> {
  await git.checkoutLocalBranch(branchName);
  await git.push(['-u', 'origin', branchName]);
}

export async function getCurrentBranch(): Promise<string> {
  return (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
}

export function extractTicketId(branchName: string): string | null {
  const match = branchName.match(/([A-Z]+-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export async function getForge(): Promise<ForgeInfo> {
  let remoteUrl: string;
  try {
    remoteUrl = (await git.remote(['get-url', 'origin'])) ?? '';
    remoteUrl = remoteUrl.trim();
  } catch {
    throw new LynError('No git remote "origin" found.');
  }

  // SSH: git@github.com:owner/repo.git
  // HTTPS: https://github.com/owner/repo.git
  const ghMatch = remoteUrl.match(
    /github\.com[:/]([^/]+)\/([^/.]+)/,
  );
  if (ghMatch) {
    return { type: 'github', owner: ghMatch[1], repo: ghMatch[2] };
  }

  const glMatch = remoteUrl.match(
    /gitlab\.com[:/]([^/]+)\/([^/.]+)/,
  );
  if (glMatch) {
    return { type: 'gitlab', owner: glMatch[1], repo: glMatch[2] };
  }

  throw new LynError(
    `Could not detect GitHub or GitLab from remote URL: ${remoteUrl}`,
  );
}

export async function createDraftPR(
  title: string,
  body: string,
  baseBranch: string,
): Promise<string> {
  const forge = await getForge();

  return new Promise((resolve, reject) => {
    let cmd: string;
    if (forge.type === 'github') {
      cmd = `gh pr create --draft --title ${shellEscape(title)} --body ${shellEscape(body)} --base ${baseBranch}`;
    } else {
      cmd = `glab mr create --draft --title ${shellEscape(title)} --description ${shellEscape(body)} --target-branch ${baseBranch} --yes`;
    }

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new LynError(`Failed to create draft PR: ${stderr || error.message}`));
        return;
      }
      // gh/glab typically print the URL
      const url = stdout.trim().split('\n').pop() ?? '';
      resolve(url);
    });
  });
}

export async function undraftPR(): Promise<void> {
  const forge = await getForge();
  const cmd =
    forge.type === 'github'
      ? 'gh pr ready'
      : 'glab mr update --ready';

  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (e: any) {
    throw new LynError(`Failed to mark PR as ready: ${e.message}`);
  }
}

export async function branchExists(branchName: string): Promise<boolean> {
  const branches = await git.branchLocal();
  return branches.all.includes(branchName);
}

function shellEscape(str: string): string {
  return `'${str.replace(/'/g, "'\\''")}'`;
}
