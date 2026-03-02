---
name: whoop-cli
description: Agent-first WHOOP CLI — health metrics, insights, and trend analysis via structured JSON.
homepage: https://github.com/TomasWard1/whoop-cli
metadata: {"clawdis":{"emoji":"💪","requires":{"bins":["node"],"env":["WHOOP_CLIENT_ID","WHOOP_CLIENT_SECRET","WHOOP_REDIRECT_URI"]},"install":[{"id":"npm","kind":"npm","package":"whoop-cli","bins":["whoop-cli"],"label":"Install whoop-cli (npm)"}]}}
---

# whoop-cli

Agent-first CLI for WHOOP health data. All commands output JSON to stdout when piped, pretty text when interactive.

Install: `npm install -g whoop-cli` | [GitHub](https://github.com/TomasWard1/whoop-cli)

## Agent quick start

```bash
# Health check (one call, flat JSON)
whoop-cli check
# → {"ok":true,"checked_at":"...","recovery_score":72,"hrv_rmssd_milli":45.2,"sleep_hours":7.1,"strain":8.3}

# Auth pre-flight (exit code 2 = not authenticated)
whoop-cli auth status
echo $?  # 0 = ok, 2 = needs login

# Refresh tokens (for cron jobs)
whoop-cli auth refresh
```

## Commands

### check — single-call health snapshot
```bash
whoop-cli check                    # today's metrics as flat JSON
whoop-cli check --date 2026-03-01  # specific date
```
Returns: `{ok, checked_at, auth.needs_refresh, date, recovery_score, hrv_rmssd_milli, resting_heart_rate, sleep_performance, sleep_hours, sleep_efficiency, strain, calories, workout_count}`

### summary — one-liner health status
```bash
whoop-cli summary                  # JSON when piped, text when interactive
whoop-cli summary --color          # color-coded with status indicators
whoop-cli summary --format json    # force JSON
```

### Data commands — sleep, recovery, workout, cycle, profile, body
```bash
whoop-cli recovery                          # today's recovery
whoop-cli sleep --date 2026-03-01           # specific date
whoop-cli workout -s 2026-01-01 -e 2026-03-01 -a  # date range, all pages
whoop-cli cycle --format json               # force JSON output
```

### multi — multiple data types in one call
```bash
whoop-cli multi --sleep --recovery --workout           # today
whoop-cli multi --sleep --recovery -s 2026-01-01 -e 2026-03-01 -a  # date range
```

### trends — multi-day trend analysis
```bash
whoop-cli trends                    # 7-day trends
whoop-cli trends --days 30          # 30-day trends (1-90 supported)
whoop-cli trends --json             # force JSON
```

### insights — health recommendations
```bash
whoop-cli insights                  # today's insights
whoop-cli insights --date 2026-03-01 --json
```

### auth — authentication management
```bash
whoop-cli auth login    # OAuth flow (opens browser)
whoop-cli auth status   # JSON status, exit code 2 if not authenticated
whoop-cli auth refresh  # proactive token refresh (for cron)
whoop-cli auth logout   # clear tokens
```

## Output behavior

- **Piped** (no TTY): JSON to stdout. Errors as `{"error":"...","code":2}` to stdout.
- **Interactive** (TTY): human-readable text. Errors as plain text to stderr.
- `--format json|pretty|auto` on all data commands (default: auto)
- `--pretty` shorthand for `--format pretty`
- `--json` shorthand on trends/insights

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Auth error (not logged in, token expired) |
| 3 | Rate limited |
| 4 | Network error |

## Date handling

- Default: WHOOP day (4am local time cutoff)
- `--date YYYY-MM-DD` for specific dates
- `--start` / `--end` for range queries on data and multi commands
- `--all` / `-a` to paginate through all results

## Notes

- Tokens stored in `~/.whoop-cli/tokens.json` (auto-refresh on API calls)
- Uses WHOOP API v2
- WHOOP apps with <10 users don't need review (immediate use)
