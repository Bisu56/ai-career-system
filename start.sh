#!/usr/bin/env bash
# Starts all three services. Press Ctrl+C to stop them all.
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pids=()
cleanup() {
  echo ""
  echo "==> Stopping services..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  exit 0
}
trap cleanup INT TERM

echo "==> Starting AI service on http://127.0.0.1:8001"
( cd "$ROOT/backend/ai-service" && ./venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001 ) &
pids+=($!)

echo "==> Starting Laravel API on http://127.0.0.1:8000"
( cd "$ROOT/backend/laravel-api" && php artisan serve --host=127.0.0.1 --port=8000 ) &
pids+=($!)

echo "==> Starting frontend on http://localhost:5173"
( cd "$ROOT/frontend" && npm run dev ) &
pids+=($!)

echo ""
echo "==> All services starting. Open http://localhost:5173"
echo "==> Press Ctrl+C to stop."
wait
