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
| **backend/ai-service** | FastAPI, scikit-learn, spaCy | 8001 | Career prediction, skill extraction, recommendations, job matching |

Flow: the frontend talks only to the Laravel API. Laravel extracts text from the
uploaded PDF and forwards it to the AI service's `/analyze` endpoint, then stores the
result in SQLite.

## Job portal

The **Job Portal** page (`/jobs`) lists real, currently open roles pulled from two
free public job APIs and ranks them against the skills extracted from your most
recent resume.

| Source | Endpoint | Key required |
|--------|----------|--------------|
| [Jobicy](https://jobicy.com/jobs/api) | `jobicy.com/api/v2/remote-jobs` | no |
| [Arbeitnow](https://www.arbeitnow.com/api) | `arbeitnow.com/api/job-board-api` | no |

Neither needs an account or an API key. Every listing gets a **match percentage**
plus the skills you already have and the ones the post asks for that your resume
doesn't mention, so the gap is visible per job. Results are searchable and
filterable by location, remote-only, and minimum match.

Your own location is parsed from the resume's contact block ("Austin, TX",
"London, United Kingdom", "Location: Kathmandu") and stored on the analysis. It
is shown on the results page and the portal, flags roles near you with a
**Nearby** badge, and lifts them in the ranking — a US state is expanded to the
country terms boards actually write, so a candidate in Austin sees a "USA"
listing as nearby. It never filters on its own; **Only show jobs here** applies
it as a hard filter when you want that.

Scoring is weighted rather than a plain skill count: a match on a framework
counts more than one on `html` or `git`, listings that only name a single
technology are treated as noise, and roles whose title echoes your predicted
career rank higher.

Responses are cached to `backend/ai-service/jobs_cache.json` for 6 hours, and
the cache is served if a provider is down — so the page still works offline once
it has been loaded at least once. **Refresh** forces a re-fetch.

## Prerequisites

- An internet connection for the job portal's first load (cached afterwards)
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

## Running tests

**Laravel API** (in-memory SQLite, no setup needed):

```bash
cd backend/laravel-api
php artisan test
```

**AI service**:

```bash
cd backend/ai-service
./venv/bin/python -m pytest
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
| GET | `/api/jobs` | JWT | Live job listings ranked against your resume |
| DELETE | `/api/resume/{id}` | JWT | Delete an analysis |
| GET | `/api/analytics` | JWT | Dashboard summary stats |
| GET | `/api/admin/analytics` | JWT (admin) | System-wide stats (requires `is_admin`) |

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
