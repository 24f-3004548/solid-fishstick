#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-5001}"
FRONTEND_PORT="${FRONTEND_PORT:-5500}"
REDIS_PORT="${REDIS_PORT:-6379}"

killed_any=0

kill_pids() {
  local label="$1"
  shift
  local pids=("$@")

  if [[ "${#pids[@]}" -eq 0 ]]; then
    return
  fi

  killed_any=1
  echo "Stopping $label: ${pids[*]}"

  kill "${pids[@]}" >/dev/null 2>&1 || true
  sleep 1

  local remaining=()
  local pid
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      remaining+=("$pid")
    fi
  done

  if [[ "${#remaining[@]}" -gt 0 ]]; then
    echo "Force stopping $label: ${remaining[*]}"
    kill -9 "${remaining[@]}" >/dev/null 2>&1 || true
  fi
}

kill_by_port() {
  local label="$1"
  local port="$2"

  if ! command -v lsof >/dev/null 2>&1; then
    echo "lsof not found, skipping $label port check"
    return
  fi

  pids=()
  while IFS= read -r line; do
    pids+=("$line")
  done < <(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  kill_pids "$label (port $port)" "${pids[@]:-}"
}

kill_by_pattern() {
  local label="$1"
  local pattern="$2"

  pids=()
  while IFS= read -r line; do
    pids+=("$line")
  done < <(pgrep -f "$pattern" 2>/dev/null || true)
  kill_pids "$label" "${pids[@]:-}"
}

echo "Stopping placement portal services..."

kill_by_pattern "celery worker" "celery -A celery_worker\.celery worker"
kill_by_pattern "celery beat" "celery -A celery_worker\.celery beat"

kill_by_port "backend" "$BACKEND_PORT"
kill_by_port "frontend" "$FRONTEND_PORT"
kill_by_port "redis" "$REDIS_PORT"

if [[ "$killed_any" -eq 0 ]]; then
  echo "No matching placement portal services were running."
else
  echo "Placement portal services stopped."
fi
