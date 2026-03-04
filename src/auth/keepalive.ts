import { execFileSync } from 'node:child_process';
import { WhoopError, ExitCode } from '../utils/errors.js';
import { loadTokens } from './tokens.js';

const CRON_MARKER = '# whoop-cli keepalive';

function getWhoopBin(): string {
  try {
    return execFileSync('which', ['whoop'], { encoding: 'utf-8' }).trim();
  } catch {
    try {
      return execFileSync('which', ['whoop-cli'], { encoding: 'utf-8' }).trim();
    } catch {
      throw new WhoopError(
        'Could not find whoop or whoop-cli in PATH. Install globally first: npm link',
        ExitCode.GENERAL_ERROR,
      );
    }
  }
}

function getNodeBinDir(): string {
  return execFileSync('node', ['-e', 'process.stdout.write(path.dirname(process.execPath))', '-r', 'path'],
    { encoding: 'utf-8' }).trim();
}

function getCurrentCrontab(): string {
  try {
    return execFileSync('crontab', ['-l'], { encoding: 'utf-8' });
  } catch {
    return '';
  }
}

function setCrontab(content: string): void {
  execFileSync('crontab', ['-'], { encoding: 'utf-8', input: content });
}

function hasKeepalive(crontab: string): boolean {
  return crontab.includes(CRON_MARKER);
}

export function keepaliveEnable(): void {
  const tokens = loadTokens();
  if (!tokens) {
    throw new WhoopError('Not authenticated. Run: whoop auth login first', ExitCode.AUTH_ERROR);
  }

  const crontab = getCurrentCrontab();

  if (hasKeepalive(crontab)) {
    const tty = !!process.stdout.isTTY;
    if (tty) {
      console.error('Keepalive already active. Use: whoop auth keepalive --status');
    } else {
      console.log(JSON.stringify({ success: true, message: 'Keepalive already active' }));
    }
    return;
  }

  const bin = getWhoopBin();
  const nodeBinDir = getNodeBinDir();
  const cronLine = `*/45 * * * * PATH=${nodeBinDir}:$PATH ${bin} auth refresh >> ~/.whoop-cli/keepalive.log 2>&1 ${CRON_MARKER}`;
  const newCrontab = crontab.trimEnd() + '\n' + cronLine + '\n';

  setCrontab(newCrontab);

  const tty = !!process.stdout.isTTY;
  if (tty) {
    console.error('✓ Keepalive enabled — tokens will refresh every 45 minutes');
    console.error(`  Cron: ${cronLine}`);
    console.error('  Log:  ~/.whoop-cli/keepalive.log');
  } else {
    console.log(JSON.stringify({
      success: true,
      message: 'Keepalive enabled',
      interval_minutes: 45,
      cron: cronLine,
      log: '~/.whoop-cli/keepalive.log',
    }));
  }
}

export function keepaliveDisable(): void {
  const crontab = getCurrentCrontab();

  if (!hasKeepalive(crontab)) {
    const tty = !!process.stdout.isTTY;
    if (tty) {
      console.error('Keepalive is not active.');
    } else {
      console.log(JSON.stringify({ success: true, message: 'Keepalive is not active' }));
    }
    return;
  }

  const newCrontab = crontab
    .split('\n')
    .filter(line => !line.includes(CRON_MARKER))
    .join('\n');

  setCrontab(newCrontab);

  const tty = !!process.stdout.isTTY;
  if (tty) {
    console.error('✓ Keepalive disabled — cron job removed');
  } else {
    console.log(JSON.stringify({ success: true, message: 'Keepalive disabled' }));
  }
}

export function keepaliveStatus(): void {
  const crontab = getCurrentCrontab();
  const active = hasKeepalive(crontab);
  const tty = !!process.stdout.isTTY;

  if (tty) {
    if (active) {
      const cronLine = crontab.split('\n').find(l => l.includes(CRON_MARKER)) || '';
      console.error('✓ Keepalive is active');
      console.error(`  ${cronLine.replace(` ${CRON_MARKER}`, '')}`);
    } else {
      console.error('Keepalive is not active. Enable with: whoop auth keepalive');
    }
  } else {
    console.log(JSON.stringify({ active }));
  }
}

export function keepalive(flag?: string): void {
  switch (flag) {
    case '--disable':
    case '--off':
      keepaliveDisable();
      break;
    case '--status':
      keepaliveStatus();
      break;
    default:
      keepaliveEnable();
      break;
  }
}
