# whoop-cli

Your WHOOP data, from the terminal. Built for humans and agents.

> Based on [whoopskill](https://github.com/koala73/whoopskill) by [@koala73](https://github.com/koala73).

## Install

```bash
npm install -g whoop-cli
```

Both `whoop` and `whoop-cli` work as commands.

## Setup

```bash
whoop auth login
```

First time? The CLI walks you through it:

```
WHOOP CLI — First-time setup
────────────────────────────

1. Go to https://developer.whoop.com
2. Create an application (apps with <10 users need no review)
3. Set the Redirect URI to: http://localhost:8787/callback
4. Copy your Client ID and Client Secret below

Everything stays local in ~/.whoop-cli/config.json

Client ID: ________
Client Secret: ********

✓ Credentials saved
```

Then it opens your browser for OAuth. Authorize, paste the callback URL, done. Tokens auto-refresh after that — you won't need to log in again.

## Usage

### Quick check

```bash
whoop check              # Today's health snapshot
whoop summary --color    # Color-coded with status indicators
whoop insights           # Personalized recommendations
```

In a terminal, `check` shows a human-readable summary:

```
📅 2026-03-02
🟢 Recovery: 75% | HRV: 106ms | RHR: 37bpm
🟢 Sleep: 76% | 7.5h | Efficiency: 92%
🟡 Strain: 6.9 (optimal: ~14) | 1649 cal
🏋️ Workouts: 1 | Strength Training
```

Piped or in a script, it outputs flat JSON automatically.

### Data commands

```bash
whoop recovery           # Today's recovery
whoop sleep              # Today's sleep
whoop workout            # Today's workouts
whoop cycle              # Today's cycle
whoop profile            # User profile
whoop body               # Body measurements
```

### Date ranges

```bash
whoop workout -d 2026-01-15                       # Specific date
whoop workout -s 2026-01-01 -e 2026-03-01         # Date range
whoop workout -s 2026-01-01 -e 2026-03-01 -a      # All pages
```

### Trends & insights

```bash
whoop trends                # 7-day trends
whoop trends --days 30      # Any period (1-90 days)
whoop insights              # Health recommendations
```

### Multi-type fetch

```bash
whoop multi --sleep --recovery --body
whoop multi --sleep --workout -s 2026-01-01 -e 2026-03-01 -a
```

### Auth

```bash
whoop auth login        # OAuth flow (opens browser)
whoop auth status       # Check auth state
whoop auth refresh      # Force token refresh
whoop auth logout       # Clear tokens
```

## Output

**TTY-aware** — the CLI detects how you're using it:

| Context | Output |
|---------|--------|
| Terminal (human) | Pretty text, color-coded |
| Piped / scripted (agent) | Structured JSON to stdout |

Force a specific format:

```bash
whoop recovery --format json      # Force JSON
whoop recovery --format pretty    # Force pretty
whoop recovery --pretty           # Shorthand
```

## Options

| Flag | Description |
|------|-------------|
| `-d, --date <date>` | Date (YYYY-MM-DD) |
| `-s, --start <date>` | Start date for range |
| `-e, --end <date>` | End date for range |
| `-l, --limit <n>` | Results per page (default: 25) |
| `-a, --all` | Fetch all pages |
| `-f, --format <fmt>` | `json`, `pretty`, or `auto` (default: auto) |
| `-p, --pretty` | Shorthand for `--format pretty` |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Auth error (not logged in, bad credentials) |
| 3 | Rate limit exceeded |
| 4 | Network error |

## For Agents

Agents get JSON automatically when output is piped. Recommended starting point:

```bash
whoop check    # → {"ok":true,"recovery_score":75,"hrv_rmssd_milli":106,...}
```

### Agent self-install

```bash
git clone https://github.com/TomasWard1/whoop-cli.git ~/tools/whoop-cli
cd ~/tools/whoop-cli && npm install && npm run build

# Create global wrapper
NODE_BIN=$(dirname $(which node))
printf '#!/usr/bin/env node\nrequire("%s/dist/index.js");\n' "$HOME/tools/whoop-cli" > "$NODE_BIN/whoop-cli"
chmod +x "$NODE_BIN/whoop-cli"

# Set credentials via env vars (skip interactive prompt)
export WHOOP_CLIENT_ID=<client_id>
export WHOOP_CLIENT_SECRET=<client_secret>

# Verify
whoop-cli auth status
```

A human must complete `whoop auth login` once (OAuth browser flow). After that, tokens auto-refresh and agents can use all commands without human interaction.

### Credential priority

1. Environment variables (`WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`)
2. Config file (`~/.whoop-cli/config.json`)
3. Interactive prompt (humans only)

## Storage

```
~/.whoop-cli/
├── config.json    # Client credentials (600 perms)
└── tokens.json    # OAuth tokens (600 perms, auto-refresh)
```

## Development

```bash
git clone https://github.com/TomasWard1/whoop-cli.git
cd whoop-cli
npm install
npm test           # 65 tests
npm run dev        # Run with tsx
npm run build      # Compile TypeScript
```

## Requirements

- Node.js 22+
- WHOOP membership with API access

## License

MIT
