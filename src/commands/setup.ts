import { Command } from 'commander';
import { input, password, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { writeConfig, readConfig } from '../lib/config.js';
import { setApiKey } from '../lib/secrets.js';
import { validateApiKey, getTeams } from '../lib/linear.js';
import { runOAuthFlow } from '../lib/oauth.js';
import { wrapAction } from '../lib/errors.js';
import type { LynConfig } from '../types.js';

export function registerSetup(program: Command) {
  program
    .command('setup')
    .description('Configure lyn with your Linear account')
    .option('--api-key', 'Use a personal API key instead of OAuth')
    .action(
      wrapAction(async (opts) => {
        console.log(chalk.bold('\n  lyn setup\n'));
        console.log(chalk.dim('  Connect lyn to your Linear workspace.\n'));

        const existing = readConfig();
        let accessToken: string;
        let authMethod: 'oauth' | 'api-key';
        let oauthClientId: string | undefined;
        let oauthClientSecret: string | undefined;

        if (opts.apiKey) {
          // API key flow
          authMethod = 'api-key';
          accessToken = await password({
            message: 'Linear API key (from https://linear.app/settings/api):',
            mask: '*',
          });
        } else {
          // OAuth flow
          authMethod = 'oauth';
          console.log(chalk.dim('  Using OAuth. You need a Linear OAuth application.'));
          console.log(chalk.dim('  Create one at: https://linear.app/settings/api/applications/new'));
          console.log(chalk.dim(`  Set the callback URL to: ${chalk.bold('http://localhost:3847/callback')}\n`));

          oauthClientId = await input({
            message: 'OAuth Client ID:',
            default: existing?.oauthClientId,
          });

          oauthClientSecret = await password({
            message: 'OAuth Client Secret:',
            mask: '*',
          });

          console.log(chalk.dim('\n  Starting OAuth flow...'));
          const result = await runOAuthFlow(oauthClientId, oauthClientSecret);
          accessToken = result.accessToken;
        }

        // Validate
        console.log(chalk.dim('  Validating...'));
        const validation = await validateApiKey(accessToken);
        if (!validation.valid) {
          console.error(chalk.red('  Authentication failed. Please check your credentials and try again.'));
          process.exit(1);
        }

        console.log(chalk.green(`  Authenticated as ${validation.name} (${validation.email})`));

        // Store token
        if (authMethod === 'api-key') {
          await setApiKey(accessToken);
        }

        // Initials
        const nameInitials = validation.name
          ? validation.name
              .split(' ')
              .map((n) => n[0]?.toLowerCase())
              .join('')
          : '';

        const initials = await input({
          message: 'Your initials (used for branch names):',
          default: existing?.initials || nameInitials,
        });

        // Write temp config so getTeams can authenticate
        const tempConfig: LynConfig = {
          initials,
          defaultTeamId: '',
          defaultTeamKey: '',
          authMethod,
        };
        if (authMethod === 'oauth') {
          tempConfig.oauthClientId = oauthClientId;
          tempConfig.oauthClientSecret = oauthClientSecret;
          tempConfig.oauthAccessToken = accessToken;
        } else {
          tempConfig.linearApiKey = accessToken;
        }
        writeConfig(tempConfig);

        // Default team
        const teams = await getTeams();
        let defaultTeamId = '';
        let defaultTeamKey = '';

        if (teams.length === 1) {
          defaultTeamId = teams[0].id;
          defaultTeamKey = teams[0].key;
          console.log(chalk.dim(`  Using team: ${teams[0].name} (${teams[0].key})`));
        } else if (teams.length > 1) {
          const choice = await select({
            message: 'Default team:',
            choices: teams.map((t) => ({
              name: `${t.name} (${t.key})`,
              value: t.id,
            })),
          });
          defaultTeamId = choice;
          defaultTeamKey = teams.find((t) => t.id === choice)?.key ?? '';
        }

        // Write final config
        const finalConfig: LynConfig = {
          initials,
          defaultTeamId,
          defaultTeamKey,
          authMethod,
        };
        if (authMethod === 'oauth') {
          finalConfig.oauthClientId = oauthClientId;
          finalConfig.oauthClientSecret = oauthClientSecret;
          finalConfig.oauthAccessToken = accessToken;
        } else {
          finalConfig.linearApiKey = accessToken;
        }
        writeConfig(finalConfig);

        console.log(chalk.green('\n  Setup complete!\n'));
        console.log(chalk.dim('  Try `lyn mine` to see your assigned tickets.'));
      }),
    );
}
