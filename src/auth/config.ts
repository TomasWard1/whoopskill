import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.whoop-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface CliConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export function loadConfig(): CliConfig | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    if (!data.client_id || !data.client_secret || !data.redirect_uri) return null;
    return data as CliConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: CliConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  chmodSync(CONFIG_FILE, 0o600);
}

const DEFAULT_REDIRECT_URI = 'http://localhost:8787/callback';

export function getCredentials(): { clientId: string; clientSecret: string; redirectUri: string } | null {
  // Priority: env vars > config file
  const envId = process.env.WHOOP_CLIENT_ID;
  const envSecret = process.env.WHOOP_CLIENT_SECRET;
  const envUri = process.env.WHOOP_REDIRECT_URI;

  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, redirectUri: envUri || DEFAULT_REDIRECT_URI };
  }

  const config = loadConfig();
  if (config) {
    return { clientId: config.client_id, clientSecret: config.client_secret, redirectUri: config.redirect_uri };
  }

  return null;
}
