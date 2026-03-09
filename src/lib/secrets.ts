import { readConfig, writeConfig } from './config.js';
import chalk from 'chalk';

const SERVICE = 'lyn-cli';
const ACCOUNT = 'linear-api-key';

async function tryKeytar(): Promise<any> {
  try {
    return await import('keytar' as string);
  } catch {
    return null;
  }
}

export async function getApiKey(): Promise<string | null> {
  // Check OAuth token first
  const config = readConfig();
  if (config?.oauthAccessToken) {
    return config.oauthAccessToken;
  }

  // Then keytar
  const kt = await tryKeytar();
  if (kt) {
    const key = await kt.getPassword(SERVICE, ACCOUNT);
    if (key) return key;
  }

  // Then config file API key
  return config?.linearApiKey ?? null;
}

export async function setApiKey(key: string): Promise<void> {
  const kt = await tryKeytar();
  if (kt) {
    try {
      await kt.setPassword(SERVICE, ACCOUNT, key);
      return;
    } catch {
      // fall through to config file
    }
  }
  console.warn(
    chalk.yellow('Warning: keytar unavailable, storing API key in ~/.lyn/config.json'),
  );
  const config = readConfig() ?? {
    initials: '',
    defaultTeamId: '',
    defaultTeamKey: '',
  };
  config.linearApiKey = key;
  writeConfig(config);
}
