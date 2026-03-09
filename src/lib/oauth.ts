import { createServer } from 'node:http';
import { URL } from 'node:url';
import { randomBytes } from 'node:crypto';
import chalk from 'chalk';

const LINEAR_AUTHORIZE_URL = 'https://linear.app/oauth/authorize';
const LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token';
const REDIRECT_PORT = 3847;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

export interface OAuthResult {
  accessToken: string;
}

export async function runOAuthFlow(
  clientId: string,
  clientSecret: string,
): Promise<OAuthResult> {
  const state = randomBytes(16).toString('hex');

  const authorizeUrl = new URL(LINEAR_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'read,write,issues:create,comments:create');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('prompt', 'consent');

  const code = await startCallbackServer(state, authorizeUrl.toString());
  const token = await exchangeCode(code, clientId, clientSecret);

  return { accessToken: token };
}

function startCallbackServer(
  expectedState: string,
  authorizeUrl: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${REDIRECT_PORT}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Authorization denied.</h2><p>You can close this tab.</p></body></html>');
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Invalid state.</h2></body></html>');
        server.close();
        reject(new Error('OAuth state mismatch'));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>No authorization code received.</h2></body></html>');
        server.close();
        reject(new Error('No auth code'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h2>Authorized!</h2><p>You can close this tab and return to your terminal.</p></body></html>');
      server.close();
      resolve(code);
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(chalk.dim(`\n  Listening on port ${REDIRECT_PORT} for callback...`));
      console.log(chalk.bold('\n  Opening browser for Linear authorization...\n'));

      // Open browser
      const openUrl = authorizeUrl;
      import('node:child_process').then(({ exec }) => {
        // Try xdg-open (Linux), open (macOS), start (Windows)
        const cmds = [
          `xdg-open "${openUrl}"`,
          `open "${openUrl}"`,
          `start "" "${openUrl}"`,
        ];

        let opened = false;
        for (const cmd of cmds) {
          try {
            exec(cmd);
            opened = true;
            break;
          } catch {
            continue;
          }
        }

        if (!opened) {
          console.log(chalk.yellow('  Could not open browser automatically.'));
        }
        console.log(chalk.dim(`  If browser didn't open, visit:\n  ${openUrl}\n`));
      });
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth flow timed out after 2 minutes.'));
    }, 120_000);
  });
}

async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const response = await fetch(LINEAR_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}
