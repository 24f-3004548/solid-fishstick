#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_ACTIVATE="$ROOT_DIR/venv/bin/activate"

BACKEND_PORT="${BACKEND_PORT:-5001}"
FRONTEND_PORT="${FRONTEND_PORT:-5500}"

export BACKEND_PORT

if [[ ! -f "$VENV_ACTIVATE" ]]; then
  echo "Virtual environment not found at: $VENV_ACTIVATE"
  echo "Create it first (from project root): python3 -m venv venv"
  exit 1
fi

if ! command -v redis-server >/dev/null 2>&1; then
  echo "redis-server not found (install: brew install redis)"
  exit 1
fi

source "$VENV_ACTIVATE"

PIDS=()

cleanup() {
  echo
  echo "Stopping services..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  wait || true
  echo "All services stopped."
}

trap cleanup INT TERM EXIT

echo "Starting services..."

echo "[backend] http://127.0.0.1:$BACKEND_PORT"
(
  cd "$ROOT_DIR/backend"
  source "$VENV_ACTIVATE"
  python run.py
) &
PIDS+=("$!")

echo "[frontend] http://127.0.0.1:$FRONTEND_PORT"
(
  cd "$ROOT_DIR/frontend"
  source "$VENV_ACTIVATE"
  python -m http.server "$FRONTEND_PORT"
) &
PIDS+=("$!")

echo "[redis] redis://127.0.0.1:6379"
(
  redis-server
) &
PIDS+=("$!")

echo "[celery-worker] starting"
(
  cd "$ROOT_DIR/backend"
  source "$VENV_ACTIVATE"
  celery -A celery_worker.celery worker -l info
) &
PIDS+=("$!")

echo "[celery-beat] starting"
(
  cd "$ROOT_DIR/backend"
  source "$VENV_ACTIVATE"
  celery -A celery_worker.celery beat -l info
) &
PIDS+=("$!")

echo ""
echo "Running. Press Ctrl+C to stop all services."
wait
