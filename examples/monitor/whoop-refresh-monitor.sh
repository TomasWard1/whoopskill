#!/usr/bin/env bash
set -euo pipefail

# whoop-refresh-monitor.sh
#
# Purpose:
# - Prevent silent failures when running whoop-cli from cron/systemd by proactively refreshing tokens.
# - Optionally emits a simple health snapshot to confirm the API is reachable.
#
# Requires:
# - whoop-cli installed and authenticated at least once: `whoop-cli auth login`
# - WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET / WHOOP_REDIRECT_URI configured (env or .env)
#
# Notes:
# - This script does NOT re-run the browser login flow. If refresh fails due to expired refresh token,
#   you must run: `whoop-cli auth login`

LOG_FILE="${WHOOP_MONITOR_LOG_FILE:-$HOME/.whoop-cli/monitor.log}"
VERBOSE="${WHOOP_MONITOR_VERBOSE:-0}"

mkdir -p "$(dirname "$LOG_FILE")"

stamp() { date -Iseconds; }

# Attempt refresh (will exit non-zero if refresh token is expired/invalid)
if ! out=$(whoop-cli auth refresh 2>&1); then
  echo "$(stamp) | ALERT: whoop-cli auth refresh failed. Run: whoop-cli auth login" >> "$LOG_FILE"
  echo "$(stamp) | Details: $out" >> "$LOG_FILE"
  if [ "$VERBOSE" = "1" ]; then
    echo "$out" >&2
  fi
  exit 2
fi

# Optional lightweight fetch to validate end-to-end (cycle is usually present during the day)
# This should be cheap and avoids paging through large datasets.
if ! data=$(whoop-cli --cycle 2>/dev/null); then
  echo "$(stamp) | ALERT: whoop-cli fetch failed" >> "$LOG_FILE"
  exit 3
fi

strain=$(echo "$data" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(s);console.log(j?.cycle?.[0]?.score?.strain ?? "N/A");}catch(e){console.log("N/A")}})')

echo "$(stamp) | OK | strain=${strain}" >> "$LOG_FILE"

if [ "$VERBOSE" = "1" ]; then
  echo "OK | strain=${strain}"
fi
