# whoop-cli

Agent-first CLI for the WHOOP API v2.

Built for programmatic access — structured JSON output, proper exit codes, and pagination support. Works great as a tool for AI agents, cron jobs, and scripts.

> Based on [whoopskill](https://github.com/koala73/whoopskill) by [@koala73](https://github.com/koala73). Thank you for the solid foundation.

## Install

```bash
npm install -g whoop-cli
```

## Quick Start

```bash
# Single-call health check (flat JSON, perfect for agents)
whoop-cli check

# Today's recovery data
whoop-cli recovery

# One-liner health snapshot
whoop-cli summary

# Human-readable output
whoop-cli recovery --pretty

# Color-coded summary
whoop-cli summary --color
```

## Setup

1. Register a WHOOP application at [developer.whoop.com](https://developer.whoop.com)
   - Apps with <10 users don't need WHOOP review (immediate use)

2. Set environment variables:
```bash
export WHOOP_CLIENT_ID=your_client_id
export WHOOP_CLIENT_SECRET=your_client_secret
export WHOOP_REDIRECT_URI=https://your-redirect-uri.com/callback
```

Or create a `.env` file in your working directory.

3. Authenticate:
```bash
whoop-cli auth login
```

Tokens are stored in `~/.whoop-cli/tokens.json` and auto-refresh when expired.

## Commands

### Data Commands

Each data command supports `-d`, `-s`, `-e`, `-l`, `-a`, `-p` flags.

```bash
whoop-cli sleep              # Today's sleep data
whoop-cli recovery           # Today's recovery
whoop-cli workout            # Today's workouts
whoop-cli cycle              # Today's cycle
whoop-cli profile            # User profile
whoop-cli body               # Body measurements
```

### Date Range & Pagination

```bash
# Specific date
whoop-cli workout -d 2026-01-15

# Date range
whoop-cli workout -s 2026-01-01 -e 2026-03-01

# All pages (full history)
whoop-cli workout -s 2026-01-01 -e 2026-03-01 -a

# Custom page size
whoop-cli workout -l 50
```

### Health Check (Agent Recommended)

```bash
whoop-cli check              # Auth + today's metrics in one flat JSON
whoop-cli check -d 2026-03-01
```

Returns: `{ok, checked_at, auth.needs_refresh, date, recovery_score, hrv_rmssd_milli, resting_heart_rate, sleep_performance, sleep_hours, strain, calories, workout_count}`

### Analysis Commands

```bash
whoop-cli summary            # One-liner health snapshot
whoop-cli summary --color    # Color-coded with status indicators
whoop-cli trends             # 7-day trends
whoop-cli trends --days 30   # Any period 1-90 days
whoop-cli trends --json      # Force JSON output
whoop-cli insights           # Health recommendations
whoop-cli insights --json    # Force JSON output
```

### Multi-Type Fetch

```bash
whoop-cli multi --sleep --recovery --body
whoop-cli multi --sleep --workout -s 2026-01-01 -e 2026-03-01 -a
```

### Auth

```bash
whoop-cli auth login    # OAuth flow (opens browser)
whoop-cli auth status   # JSON status, exit code 2 if not authenticated
whoop-cli auth refresh  # Proactive token refresh (for cron jobs)
whoop-cli auth logout   # Clear tokens
```

## Options

| Flag | Description |
|------|-------------|
| `-d, --date <date>` | Date in ISO format (YYYY-MM-DD) |
| `-s, --start <date>` | Start date for range query |
| `-e, --end <date>` | End date for range query |
| `-l, --limit <n>` | Max results per page (default: 25) |
| `-a, --all` | Fetch all pages |
| `-f, --format <fmt>` | Output format: `json`, `pretty`, `auto` (default: auto) |
| `-p, --pretty` | Shorthand for `--format pretty` |

## Output

**TTY-aware:** Auto-detects whether output is piped or interactive.

- **Piped** (agent/script): JSON to stdout. Errors as `{"error":"...","code":2}` to stdout.
- **Interactive** (terminal): Human-readable text. Errors as plain text to stderr.

```bash
# Agent gets JSON automatically
whoop-cli recovery | jq '.recovery[0].score.recovery_score'

# Force format explicitly
whoop-cli recovery --format json
whoop-cli recovery --format pretty
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Authentication error |
| 3 | Rate limit exceeded |
| 4 | Network error |

## Token Management

For cron/automation, tokens need periodic refresh. See `examples/monitor/` for:
- Shell script with refresh + health check
- systemd timer/service units
- Cron examples

If refresh token expires, re-authenticate with `whoop-cli auth login`.

## Data Types

| Type | Description |
|------|-------------|
| `profile` | User info (name, email) |
| `body` | Body measurements (height, weight, max HR) |
| `sleep` | Sleep records with stages, efficiency, respiratory rate |
| `recovery` | Recovery score, HRV, RHR, SpO2, skin temp |
| `workout` | Workouts with strain, HR zones, calories, distance |
| `cycle` | Daily physiological cycle (strain, calories) |

## Requirements

- Node.js 22+
- WHOOP membership with API access

## Development

```bash
git clone https://github.com/TomasWard1/whoop-cli.git
cd whoop-cli
npm install
npm run dev      # Run with tsx
npm run build    # Compile TypeScript
```

## License

MIT
