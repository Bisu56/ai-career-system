#!/usr/bin/env bash
# One-time setup for the AI Career Prediction System.
# Installs dependencies, sets up the database, and generates app keys.
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "==> Project root: $ROOT"

# --- poppler / pdftotext check ---
if ! command -v pdftotext >/dev/null 2>&1; then
  echo "!! WARNING: 'pdftotext' not found. PDF upload will fail."
  echo "   Install poppler:  macOS: brew install poppler  |  Ubuntu: sudo apt-get install poppler-utils"
fi

# --- AI service ---
echo "==> Setting up AI service (FastAPI)..."
cd "$ROOT/backend/ai-service"
if [ ! -d venv ]; then
  python3 -m venv venv
fi
./venv/bin/pip install --quiet --upgrade pip
./venv/bin/pip install --quiet -r requirements.txt
./venv/bin/python -m spacy download en_core_web_sm

# --- Laravel API ---
echo "==> Setting up Laravel API..."
cd "$ROOT/backend/laravel-api"
[ -d vendor ] || composer install
[ -f .env ] || cp .env.example .env
php artisan key:generate --force
grep -q "^JWT_SECRET=" .env || php artisan jwt:secret --force
touch database/database.sqlite
php artisan migrate --force

# --- Frontend ---
echo "==> Setting up frontend..."
cd "$ROOT/frontend"
[ -d node_modules ] || npm install

echo ""
echo "==> Setup complete. Run ./start.sh to launch all services."
