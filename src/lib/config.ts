import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { LynError } from './errors.js';
import type { LynConfig } from '../types.js';

const CONFIG_DIR = join(homedir(), '.lyn');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function getConfigDir(): string {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  return CONFIG_DIR;
}

export function readConfig(): LynConfig | null {
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as LynConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: LynConfig): void {
  getConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  chmodSync(CONFIG_FILE, 0o600);
}

export function ensureConfig(): LynConfig {
  const config = readConfig();
  if (!config) {
    throw new LynError('Not configured. Run `lyn setup` first.');
  }
  return config;
}
