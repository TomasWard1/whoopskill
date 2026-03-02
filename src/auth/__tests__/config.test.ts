import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('node:fs');
vi.mock('node:os', () => ({ homedir: vi.fn(() => '/fake/home') }));

const CONFIG_DIR = '/fake/home/.whoop-cli';
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// Dynamic import so mocks are in place
let loadConfig: typeof import('../config.js').loadConfig;
let saveConfig: typeof import('../config.js').saveConfig;
let getCredentials: typeof import('../config.js').getCredentials;

beforeEach(async () => {
  vi.resetModules();
  vi.mocked(existsSync).mockReturnValue(false);
  vi.mocked(mkdirSync).mockReturnValue(undefined);
  vi.mocked(writeFileSync).mockReturnValue(undefined);
  // Clear env
  delete process.env.WHOOP_CLIENT_ID;
  delete process.env.WHOOP_CLIENT_SECRET;
  delete process.env.WHOOP_REDIRECT_URI;

  const mod = await import('../config.js');
  loadConfig = mod.loadConfig;
  saveConfig = mod.saveConfig;
  getCredentials = mod.getCredentials;
});

describe('loadConfig', () => {
  it('returns null when config file does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(loadConfig()).toBeNull();
  });

  it('returns parsed config when file exists', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
      client_id: 'file-id',
      client_secret: 'file-secret',
      redirect_uri: 'http://localhost:8787/callback',
    }));
    const config = loadConfig();
    expect(config).toEqual({
      client_id: 'file-id',
      client_secret: 'file-secret',
      redirect_uri: 'http://localhost:8787/callback',
    });
  });

  it('returns null on invalid JSON', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('not json');
    expect(loadConfig()).toBeNull();
  });
});

describe('saveConfig', () => {
  it('creates config dir and writes file with restricted permissions', () => {
    saveConfig({
      client_id: 'my-id',
      client_secret: 'my-secret',
      redirect_uri: 'http://localhost:8787/callback',
    });
    expect(mkdirSync).toHaveBeenCalledWith(CONFIG_DIR, { recursive: true, mode: 0o700 });
    expect(writeFileSync).toHaveBeenCalledWith(
      CONFIG_FILE,
      expect.stringContaining('"client_id": "my-id"'),
    );
  });
});

describe('getCredentials', () => {
  it('returns env vars when all are set (agent mode)', () => {
    process.env.WHOOP_CLIENT_ID = 'env-id';
    process.env.WHOOP_CLIENT_SECRET = 'env-secret';
    process.env.WHOOP_REDIRECT_URI = 'http://env-uri/callback';

    const creds = getCredentials();
    expect(creds).toEqual({
      clientId: 'env-id',
      clientSecret: 'env-secret',
      redirectUri: 'http://env-uri/callback',
    });
  });

  it('uses default redirect URI when only ID and secret in env', () => {
    process.env.WHOOP_CLIENT_ID = 'env-id';
    process.env.WHOOP_CLIENT_SECRET = 'env-secret';

    const creds = getCredentials();
    expect(creds).toEqual({
      clientId: 'env-id',
      clientSecret: 'env-secret',
      redirectUri: 'http://localhost:8787/callback',
    });
  });

  it('falls back to config file when env vars missing', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
      client_id: 'file-id',
      client_secret: 'file-secret',
      redirect_uri: 'http://file-uri/callback',
    }));

    const creds = getCredentials();
    expect(creds).toEqual({
      clientId: 'file-id',
      clientSecret: 'file-secret',
      redirectUri: 'http://file-uri/callback',
    });
  });

  it('env vars override config file', () => {
    process.env.WHOOP_CLIENT_ID = 'env-id';
    process.env.WHOOP_CLIENT_SECRET = 'env-secret';
    process.env.WHOOP_REDIRECT_URI = 'http://env-uri/callback';

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
      client_id: 'file-id',
      client_secret: 'file-secret',
      redirect_uri: 'http://file-uri/callback',
    }));

    const creds = getCredentials();
    expect(creds).toEqual({
      clientId: 'env-id',
      clientSecret: 'env-secret',
      redirectUri: 'http://env-uri/callback',
    });
  });

  it('returns null when no env vars and no config file', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const creds = getCredentials();
    expect(creds).toBeNull();
  });

  it('returns null when config file has partial data', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
      client_id: 'file-id',
    }));
    const creds = getCredentials();
    expect(creds).toBeNull();
  });
});
