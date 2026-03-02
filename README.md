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
# JSON output (default, agent-friendly)
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

### Analysis Commands

```bash
whoop-cli summary            # One-liner health snapshot
whoop-cli summary --color    # Color-coded with status indicators
whoop-cli trends             # 7-day trends (also: --days 14, --days 30)
whoop-cli trends --json      # Raw JSON trends data
whoop-cli insights           # Health recommendations
whoop-cli insights --json    # Raw JSON insights
```

### Multi-Type Fetch

```bash
whoop-cli multi --sleep --recovery --body
whoop-cli multi --sleep --workout -a -p
```

### Auth

```bash
whoop-cli auth login    # OAuth flow (opens browser)
whoop-cli auth status   # Check token status (JSON)
whoop-cli auth refresh  # Refresh access token
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
| `-p, --pretty` | Human-readable output |

## Output

JSON to stdout by default. Designed for piping and programmatic consumption.

```json
{
  "date": "2026-01-05",
  "fetched_at": "2026-01-05T12:00:00.000Z",
  "recovery": [{ "score": { "recovery_score": 52, "hrv_rmssd_milli": 38.9 }}],
  "sleep": [{ "score": { "sleep_performance_percentage": 40 }}]
}
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
