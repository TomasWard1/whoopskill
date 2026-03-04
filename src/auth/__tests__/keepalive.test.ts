import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  vi.mock('node:child_process');
  vi.mock('../tokens.js', () => ({
    loadTokens: vi.fn(),
  }));

  const tokensModule = await import('../tokens.js');
  vi.mocked(tokensModule.loadTokens).mockReturnValue({
    access_token: 'test',
    refresh_token: 'test',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    scope: 'offline',
  });
});

describe('keepaliveEnable', () => {
  it('throws when not authenticated', async () => {
    const tokensModule = await import('../tokens.js');
    vi.mocked(tokensModule.loadTokens).mockReturnValue(null);
    const mod = await import('../keepalive.js');

    expect(() => mod.keepaliveEnable()).toThrow('Not authenticated');
  });

  it('installs cron job when not already active', async () => {
    const { execFileSync } = await import('node:child_process');
    const exec = vi.mocked(execFileSync);

    // which whoop + node bin dir
    exec.mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'crontab' && args?.[0] === '-l') return '';
      if (cmd === 'which') return '/usr/local/bin/whoop';
      if (cmd === 'node') return '/usr/local/bin';
      if (cmd === 'crontab' && args?.[0] === '-') return '';
      return '';
    });

    const tokensModule = await import('../tokens.js');
    vi.mocked(tokensModule.loadTokens).mockReturnValue({
      access_token: 'test',
      refresh_token: 'test',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      scope: 'offline',
    });

    const mod = await import('../keepalive.js');
    mod.keepaliveEnable();

    // Should have called crontab - to set the new crontab
    expect(exec).toHaveBeenCalledWith('crontab', ['-'], expect.objectContaining({ input: expect.stringContaining('whoop-cli keepalive') }));

    // Cron line should include PATH= to ensure node is found in non-interactive shells
    const setCalls = exec.mock.calls.filter(([cmd, args]) => cmd === 'crontab' && (args as string[])?.[0] === '-');
    const input = (setCalls[0][2] as { input: string }).input;
    expect(input).toContain('PATH=/usr/local/bin:$PATH');
  });

  it('does not duplicate cron when already active', async () => {
    const { execFileSync } = await import('node:child_process');
    const exec = vi.mocked(execFileSync);

    exec.mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'crontab' && args?.[0] === '-l') return '*/45 * * * * /usr/local/bin/whoop auth refresh # whoop-cli keepalive\n';
      return '';
    });

    const tokensModule = await import('../tokens.js');
    vi.mocked(tokensModule.loadTokens).mockReturnValue({
      access_token: 'test',
      refresh_token: 'test',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      scope: 'offline',
    });

    const mod = await import('../keepalive.js');
    mod.keepaliveEnable();

    // Should NOT have called crontab - to write
    const setCalls = exec.mock.calls.filter(([cmd, args]) => cmd === 'crontab' && (args as string[])?.[0] === '-');
    expect(setCalls).toHaveLength(0);
  });
});

describe('keepaliveDisable', () => {
  it('removes cron line when active', async () => {
    const { execFileSync } = await import('node:child_process');
    const exec = vi.mocked(execFileSync);

    const existingCron = '0 * * * * some-other-job\n*/45 * * * * /usr/local/bin/whoop auth refresh # whoop-cli keepalive\n';
    exec.mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'crontab' && args?.[0] === '-l') return existingCron;
      if (cmd === 'crontab' && args?.[0] === '-') return '';
      return '';
    });

    const mod = await import('../keepalive.js');
    mod.keepaliveDisable();

    const setCalls = exec.mock.calls.filter(([cmd, args]) => cmd === 'crontab' && (args as string[])?.[0] === '-');
    expect(setCalls).toHaveLength(1);
    const input = (setCalls[0][2] as { input: string }).input;
    expect(input).not.toContain('whoop-cli keepalive');
    expect(input).toContain('some-other-job');
  });

  it('does nothing when not active', async () => {
    const { execFileSync } = await import('node:child_process');
    const exec = vi.mocked(execFileSync);

    exec.mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'crontab' && args?.[0] === '-l') return '0 * * * * some-other-job\n';
      return '';
    });

    const mod = await import('../keepalive.js');
    mod.keepaliveDisable();

    const setCalls = exec.mock.calls.filter(([cmd, args]) => cmd === 'crontab' && (args as string[])?.[0] === '-');
    expect(setCalls).toHaveLength(0);
  });
});

describe('keepaliveStatus', () => {
  it('reports active when cron exists', async () => {
    const { execFileSync } = await import('node:child_process');
    const exec = vi.mocked(execFileSync);

    exec.mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'crontab' && args?.[0] === '-l') return '*/45 * * * * /usr/local/bin/whoop auth refresh # whoop-cli keepalive\n';
      return '';
    });

    const consoleSpy = vi.spyOn(console, 'log');
    const mod = await import('../keepalive.js');

    // Force non-TTY for JSON output
    const origIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    mod.keepaliveStatus();
    Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, configurable: true });

    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({ active: true }));
    consoleSpy.mockRestore();
  });

  it('reports inactive when no cron', async () => {
    const { execFileSync } = await import('node:child_process');
    const exec = vi.mocked(execFileSync);

    exec.mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'crontab' && args?.[0] === '-l') return '';
      return '';
    });

    const consoleSpy = vi.spyOn(console, 'log');
    const mod = await import('../keepalive.js');

    const origIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    mod.keepaliveStatus();
    Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, configurable: true });

    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({ active: false }));
    consoleSpy.mockRestore();
  });
});

describe('keepalive router', () => {
  it('routes --disable to keepaliveDisable', async () => {
    const { execFileSync } = await import('node:child_process');
    vi.mocked(execFileSync).mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'crontab' && args?.[0] === '-l') return '';
      return '';
    });

    const mod = await import('../keepalive.js');
    // Should not throw
    mod.keepalive('--disable');
  });

  it('routes --status to keepaliveStatus', async () => {
    const { execFileSync } = await import('node:child_process');
    vi.mocked(execFileSync).mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'crontab' && args?.[0] === '-l') return '';
      return '';
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mod = await import('../keepalive.js');
    mod.keepalive('--status');
    consoleSpy.mockRestore();
  });
});
