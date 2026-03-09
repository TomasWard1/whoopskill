---
name: whoop-cli
description: Fetch and analyze WHOOP health data from the terminal. Use when the user mentions WHOOP, recovery score, HRV, heart rate variability, sleep performance, strain, workout data, health metrics, or wants to check their daily health snapshot. Outputs structured JSON when piped — ideal for agent workflows.
---

# whoop-cli

CLI for WHOOP health data. All commands output JSON when piped, pretty text when interactive.

Both `whoop` and `whoop-cli` work as commands.

## Install

```bash
npm install -g @tomasward/whoop-cli
```

Requires Node.js 22+.

## Auth

A human must complete OAuth once (requires browser). After that, tokens auto-refresh.

```bash
whoop auth login      # Opens browser for OAuth
whoop auth status     # Check auth (exit code 2 = not authenticated)
whoop auth refresh    # Force token refresh
whoop auth logout     # Clear tokens
whoop auth keepalive  # Install cron for auto-refresh (every 45 min)
```

### First-time setup

The CLI prompts for WHOOP API credentials on first login:

1. Go to https://developer.whoop.com
2. Create an application (apps with <10 users need no review)
3. Set Redirect URI to `http://localhost:8787/callback`
4. Enter Client ID and Client Secret when prompted

Credentials are stored in `~/.whoop-cli/config.json`. Env vars `WHOOP_CLIENT_ID` and `WHOOP_CLIENT_SECRET` override the config file.

### Headless setup (servers / CI)

```bash
mkdir -p ~/.whoop-cli && chmod 700 ~/.whoop-cli
cat > ~/.whoop-cli/config.json << 'EOF'
{"client_id":"<id>","client_secret":"<secret>","redirect_uri":"http://localhost:8787/callback"}
EOF
chmod 600 ~/.whoop-cli/config.json
whoop auth login       # Shows URL — open on any machine, paste callback back
whoop auth keepalive   # Keep tokens fresh automatically
```

## Agent quick start

```bash
# Single-call health snapshot (flat JSON)
whoop check
# → {"ok":true,"checked_at":"...","recovery_score":72,"hrv_rmssd_milli":45.2,"sleep_hours":7.1,"strain":8.3}

# Auth pre-flight
whoop auth status
echo $?  # 0 = ok, 2 = needs login
```

## Commands

### check — single-call health snapshot
```bash
whoop check                    # today's metrics
whoop check --date 2026-03-01  # specific date
```
Returns: `{ok, checked_at, date, recovery_score, hrv_rmssd_milli, resting_heart_rate, sleep_performance, sleep_hours, sleep_efficiency, strain, calories, workout_count}`

### summary — one-liner status
```bash
whoop summary                  # JSON when piped, text when interactive
whoop summary --color          # color-coded with status indicators
whoop summary --format json    # force JSON
```

### Data commands — sleep, recovery, workout, cycle, profile, body
```bash
whoop recovery                                          # today
whoop sleep --date 2026-03-01                           # specific date
whoop workout -s 2026-01-01 -e 2026-03-01 -a           # date range, all pages
whoop cycle --format json                               # force JSON
```

### multi — multiple data types in one call
```bash
whoop multi --sleep --recovery --workout                            # today
whoop multi --sleep --recovery -s 2026-01-01 -e 2026-03-01 -a      # date range
```

### trends — multi-day analysis
```bash
whoop trends              # 7-day trends
whoop trends --days 30    # 30-day trends (1-90)
whoop trends --json       # force JSON
```

### insights — health recommendations
```bash
whoop insights                            # today
whoop insights --date 2026-03-01 --json   # specific date, JSON
```

## Output behavior

- **Piped** (no TTY): JSON to stdout. Errors as `{"error":"...","code":2}` to stdout.
- **Interactive** (TTY): human-readable text. Errors as plain text to stderr.
- `--format json|pretty|auto` on all data commands (default: auto).
- `--pretty` shorthand for `--format pretty`.
- `--json` shorthand on trends/insights.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Auth error (not logged in, token expired) |
| 3 | Rate limited |
| 4 | Network error |

## Error handling for agents

- **Exit code 2**: Auth failed. Tell the user to run `whoop auth login` manually (requires browser).
- **Exit code 3**: Rate limited. Wait and retry.
- **Exit code 4**: Network issue. Retry after a few seconds.
- If `whoop` is not found, tell the user to install: `npm install -g @tomasward/whoop-cli`.

## Date handling

- Default: WHOOP day (4am local time cutoff).
- `--date YYYY-MM-DD` for specific dates.
- `--start` / `--end` for range queries on data and multi commands.
- `--all` / `-a` to paginate through all results.

## When not to use

- This skill requires the CLI to be installed and authenticated. It cannot query the WHOOP API directly.
- If the user needs real-time streaming data or webhook integrations, this CLI does not support that.

## Links

- [GitHub](https://github.com/TomasWard1/whoop-cli)
- [WHOOP Developer Portal](https://developer.whoop.com)
