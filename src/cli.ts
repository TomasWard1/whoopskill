import { Command } from 'commander';
import { login, logout, status as authStatus, refresh as authRefresh } from './auth/oauth.js';
import { keepalive } from './auth/keepalive.js';
import { getTokenStatus, isTokenExpired, loadTokens } from './auth/tokens.js';
import { fetchData } from './api/client.js';
import { getWhoopDay, validateISODate, getDaysAgo, nowISO } from './utils/date.js';
import { handleError, WhoopError, ExitCode } from './utils/errors.js';
import { formatSummary, formatSummaryColor, extractSummary } from './utils/format.js';
import { analyzeTrends, generateInsights, formatTrends, formatInsights } from './utils/analysis.js';
import { output, resolveFormat } from './utils/output.js';
import type { OutputFormat } from './utils/output.js';
import type { DataType } from './types/whoop.js';

export const program = new Command();

function getFormat(options: { format?: string; pretty?: boolean }): OutputFormat {
  if (options.pretty) return 'pretty';
  if (options.format === 'json' || options.format === 'pretty') return options.format;
  return 'auto';
}

program
  .name('whoop-cli')
  .description('Agent-first CLI for the WHOOP API')
  .version('2.0.0');

program
  .command('auth')
  .description('Manage authentication')
  .argument('<action>', 'login, logout, status, refresh, or keepalive')
  .argument('[flag]', 'For keepalive: --status, --disable')
  .action(async (action: string, flag?: string) => {
    try {
      switch (action) {
        case 'login':
          await login();
          break;
        case 'logout':
          logout();
          break;
        case 'status':
          authStatus();
          break;
        case 'refresh':
          await authRefresh();
          break;
        case 'keepalive':
          keepalive(flag);
          break;
        default:
          throw new WhoopError(`Unknown auth action: ${action}. Use: login, logout, status, refresh, or keepalive`, ExitCode.GENERAL_ERROR);
      }
    } catch (error) {
      handleError(error);
    }
  });

function addDataCommand(name: string, description: string, dataType: DataType): void {
  program
    .command(name)
    .description(description)
    .option('-d, --date <date>', 'Date in ISO format (YYYY-MM-DD)')
    .option('-s, --start <date>', 'Start date for range query')
    .option('-e, --end <date>', 'End date for range query')
    .option('-l, --limit <number>', 'Max results per page', '25')
    .option('-a, --all', 'Fetch all pages')
    .option('-f, --format <format>', 'Output format: json, pretty, auto (default: auto)', 'auto')
    .option('-p, --pretty', 'Shorthand for --format pretty')
    .action(async (options) => {
      try {
        const date = options.date || getWhoopDay();
        if (options.date && !validateISODate(options.date)) {
          throw new WhoopError('Invalid date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
        }
        if (options.start && !validateISODate(options.start)) {
          throw new WhoopError('Invalid start date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
        }
        if (options.end && !validateISODate(options.end)) {
          throw new WhoopError('Invalid end date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
        }

        const result = await fetchData([dataType], date, {
          limit: parseInt(options.limit, 10),
          all: options.all,
          start: options.start ? options.start + 'T00:00:00.000Z' : undefined,
          end: options.end ? options.end + 'T23:59:59.999Z' : undefined,
        });

        output(result, getFormat(options));
      } catch (error) {
        handleError(error);
      }
    });
}

addDataCommand('sleep', 'Get sleep data', 'sleep');
addDataCommand('recovery', 'Get recovery data', 'recovery');
addDataCommand('workout', 'Get workout data', 'workout');
addDataCommand('cycle', 'Get cycle data', 'cycle');
addDataCommand('profile', 'Get profile data', 'profile');
addDataCommand('body', 'Get body measurements', 'body');

program
  .command('summary')
  .description('One-liner health snapshot')
  .option('-d, --date <date>', 'Date in ISO format (YYYY-MM-DD)')
  .option('-c, --color', 'Color-coded output with status indicators')
  .option('-f, --format <format>', 'Output format: json, pretty, auto (default: auto)', 'auto')
  .action(async (options) => {
    try {
      const date = options.date || getWhoopDay();
      if (options.date && !validateISODate(options.date)) {
        throw new WhoopError('Invalid date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
      }

      const result = await fetchData(['recovery', 'sleep', 'cycle', 'workout'], date, { limit: 25 });
      const fmt = resolveFormat(options.format || 'auto');
      if (fmt === 'json') {
        console.log(JSON.stringify(extractSummary(result), null, 2));
      } else {
        console.log(options.color ? formatSummaryColor(result) : formatSummary(result));
      }
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('trends')
  .description('Show trends over time (default: 7 days, max: 90)')
  .option('-n, --days <number>', 'Number of days to analyze (1-90)', '7')
  .option('-f, --format <format>', 'Output format: json, pretty, auto (default: auto)', 'auto')
  .option('--json', 'Shorthand for --format json')
  .action(async (options) => {
    try {
      const days = parseInt(options.days, 10);
      if (isNaN(days) || days < 1 || days > 90) {
        throw new WhoopError('Days must be between 1 and 90', ExitCode.GENERAL_ERROR);
      }

      const endDate = getWhoopDay();
      const startDate = getDaysAgo(days);
      const params = { start: startDate + 'T00:00:00.000Z', end: endDate + 'T23:59:59.999Z' };

      const [recovery, sleep, cycle] = await Promise.all([
        import('./api/client.js').then(m => m.getRecovery(params, true)),
        import('./api/client.js').then(m => m.getSleep(params, true)),
        import('./api/client.js').then(m => m.getCycle(params, true)),
      ]);

      const fmt = options.json ? 'json' : resolveFormat(options.format || 'auto');
      const trends = analyzeTrends(recovery, sleep, cycle, days);
      console.log(formatTrends(trends, fmt === 'pretty'));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('insights')
  .description('AI-style health insights and recommendations')
  .option('-d, --date <date>', 'Date in ISO format (YYYY-MM-DD)')
  .option('-f, --format <format>', 'Output format: json, pretty, auto (default: auto)', 'auto')
  .option('--json', 'Shorthand for --format json')
  .action(async (options) => {
    try {
      const date = options.date || getWhoopDay();
      if (options.date && !validateISODate(options.date)) {
        throw new WhoopError('Invalid date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
      }

      const startDate = getDaysAgo(7);
      const params = { start: startDate + 'T00:00:00.000Z', end: date + 'T23:59:59.999Z' };

      const [recovery, sleep, cycle, workout] = await Promise.all([
        import('./api/client.js').then(m => m.getRecovery(params, true)),
        import('./api/client.js').then(m => m.getSleep(params, true)),
        import('./api/client.js').then(m => m.getCycle(params, true)),
        import('./api/client.js').then(m => m.getWorkout({ start: date + 'T00:00:00.000Z', end: date + 'T23:59:59.999Z' }, true)),
      ]);

      const fmt = options.json ? 'json' : resolveFormat(options.format || 'auto');
      const insights = generateInsights(recovery, sleep, cycle, workout);
      console.log(formatInsights(insights, fmt === 'pretty'));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('multi')
  .description('Fetch multiple data types at once')
  .option('-d, --date <date>', 'Date in ISO format (YYYY-MM-DD)')
  .option('-s, --start <date>', 'Start date for range query')
  .option('-e, --end <date>', 'End date for range query')
  .option('-l, --limit <number>', 'Max results per page', '25')
  .option('-a, --all', 'Fetch all pages')
  .option('-f, --format <format>', 'Output format: json, pretty, auto (default: auto)', 'auto')
  .option('-p, --pretty', 'Shorthand for --format pretty')
  .option('--sleep', 'Include sleep data')
  .option('--recovery', 'Include recovery data')
  .option('--workout', 'Include workout data')
  .option('--cycle', 'Include cycle data')
  .option('--profile', 'Include profile data')
  .option('--body', 'Include body measurements')
  .action(async (options) => {
    try {
      const types: DataType[] = [];
      if (options.sleep) types.push('sleep');
      if (options.recovery) types.push('recovery');
      if (options.workout) types.push('workout');
      if (options.cycle) types.push('cycle');
      if (options.profile) types.push('profile');
      if (options.body) types.push('body');

      if (types.length === 0) {
        throw new WhoopError('Specify at least one data type: --sleep, --recovery, --workout, --cycle, --profile, --body', ExitCode.GENERAL_ERROR);
      }

      const date = options.date || getWhoopDay();
      if (options.date && !validateISODate(options.date)) {
        throw new WhoopError('Invalid date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
      }
      if (options.start && !validateISODate(options.start)) {
        throw new WhoopError('Invalid start date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
      }
      if (options.end && !validateISODate(options.end)) {
        throw new WhoopError('Invalid end date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
      }

      const result = await fetchData(types, date, {
        limit: parseInt(options.limit, 10),
        all: options.all,
        start: options.start ? options.start + 'T00:00:00.000Z' : undefined,
        end: options.end ? options.end + 'T23:59:59.999Z' : undefined,
      });

      output(result, getFormat(options));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('check')
  .description('Quick health check: auth + today\'s key metrics in one call')
  .option('-d, --date <date>', 'Date in ISO format (YYYY-MM-DD)')
  .option('-f, --format <format>', 'Output format: json, pretty, auto (default: auto)', 'auto')
  .action(async (options) => {
    try {
      const tokenStatus = getTokenStatus();
      const tokens = loadTokens();
      const tty = resolveFormat(options.format || 'auto') === 'pretty';

      if (!tokenStatus.authenticated || !tokens) {
        if (tty) {
          console.error('Not authenticated. Run: whoop auth login');
        } else {
          console.log(JSON.stringify({ ok: false, error: 'Not authenticated', code: ExitCode.AUTH_ERROR }));
        }
        process.exit(ExitCode.AUTH_ERROR);
      }

      const needsRefresh = isTokenExpired(tokens);
      const date = options.date || getWhoopDay();
      if (options.date && !validateISODate(options.date)) {
        throw new WhoopError('Invalid date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
      }

      const result = await fetchData(['recovery', 'sleep', 'cycle', 'workout'], date, { limit: 25 });

      if (tty) {
        console.log(formatSummaryColor(result));
      } else {
        const summary = extractSummary(result);
        console.log(JSON.stringify({
          ok: true,
          checked_at: nowISO(),
          auth: { needs_refresh: needsRefresh },
          ...summary,
        }));
      }
    } catch (error) {
      handleError(error);
    }
  });
