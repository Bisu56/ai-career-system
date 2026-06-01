# AI Career Prediction System

An AI-powered resume analyzer that predicts a suitable career path, extracts skills,
identifies skill gaps, and recommends jobs, courses, and interview questions from an
uploaded PDF resume.

## Architecture

The system has three independent services:

```
┌─────────────────┐      ┌──────────────────┐      ┌────────────────────┐
│  React frontend │ ───► │   Laravel API    │ ───► │  FastAPI AI service │
│   (Vite)        │ HTTP │  auth + storage  │ HTTP │  ML / NLP analysis  │
│   :5173         │      │  :8000           │      │  :8001              │
└─────────────────┘      └──────────────────┘      └────────────────────┘
```

| Service | Stack | Port | Responsibility |
|---------|-------|------|----------------|
| **frontend** | React 19, Vite, Tailwind, Recharts | 5173 | UI, auth, dashboard, charts |
| **backend/laravel-api** | Laravel 12, JWT (`tymon/jwt-auth`), SQLite | 8000 | Auth, PDF text extraction, persistence, proxy to AI |
| **backend/ai-service** | FastAPI, scikit-learn, spaCy | 8001 | Career prediction, skill extraction, recommendations |

Flow: the frontend talks only to the Laravel API. Laravel extracts text from the
uploaded PDF and forwards it to the AI service's `/analyze` endpoint, then stores the
result in SQLite.

## Prerequisites

- **PHP** 8.2+ and **Composer**
- **Node.js** 18+ and **npm**
- **Python** 3.10+
- **poppler** — provides the `pdftotext` binary used to read PDFs:
  - macOS: `brew install poppler`
  - Ubuntu/Debian: `sudo apt-get install poppler-utils`

## Quick start

From the project root:

```bash
./setup.sh     # one-time: installs deps, sets up DB, generates keys
./start.sh     # starts all three services
```

Then open **http://localhost:5173**, register an account, and upload a PDF resume.

To stop everything, press `Ctrl+C` in the terminal running `start.sh`.

## Manual setup

If you prefer to run each service yourself:

### 1. AI service (port 8001)

```bash
cd backend/ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --host 127.0.0.1 --port 8001
```

### 2. Laravel API (port 8000)

```bash
cd backend/laravel-api
composer install
cp .env.example .env          # if .env does not exist
php artisan key:generate
php artisan jwt:secret         # IMPORTANT: required for login to work
touch database/database.sqlite
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

### 3. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

## API endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | – | Create account, returns JWT |
| POST | `/api/login` | – | Log in, returns JWT |
| GET | `/api/me` | JWT | Current user |
| POST | `/api/logout` | JWT | Invalidate token |
| POST | `/api/upload-resume` | JWT | Upload PDF, run analysis |
| GET | `/api/resume/history` | JWT | Past analyses |
| DELETE | `/api/resume/{id}` | JWT | Delete an analysis |
| GET | `/api/analytics` | JWT | Dashboard summary stats |

## Troubleshooting

- **Login returns an error / nothing happens** — the JWT secret is missing. Run
  `php artisan jwt:secret` in `backend/laravel-api`.
- **"Failed to extract text from PDF: The required binary was not found"** — poppler
  is not installed. Install it (see Prerequisites) so `pdftotext` is on your PATH.
- **AI service won't start / import errors** — recreate the venv. The committed venv is
  not portable across machines; delete `backend/ai-service/venv` and redo step 1 above.

## Notes

- The database is SQLite (`backend/laravel-api/database/database.sqlite`) — no DB server needed.
- `.env`, `venv/`, `node_modules/`, and `vendor/` are git-ignored and recreated by setup.
