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

## Roles

| Role | How to get it | What they can do |
|------|---------------|------------------|
| **Job seeker** | Register normally | Upload and analyse resumes, see skill gaps, courses and interview questions, search, save and apply for jobs, track applications |
| **Employer** | Register and pick "Employer" | Company profile, post, edit, close and delete jobs, see applicants ranked by AI match score, download resumes, update application status. Starts **pending** until an admin approves the account |
| **Admin** | `php artisan admin:create you@example.com --password=Secret123` | Approve employers, moderate job postings, manage users (roles, activate, deactivate, delete), refresh the external job feed |

Employer job posts start as **pending** and only become visible to job seekers after an admin approves them. Editing the title, description, skills, level or education of an approved job sends it back for review.

### Demo data

`php artisan db:seed` creates an admin, an approved employer with three live jobs, a pending employer and a job seeker:

| Email | Password |
|-------|----------|
| admin@careerai.local | Admin12345 |
| employer@careerai.local | Employer12345 |
| pending.employer@careerai.local | Employer12345 |
| seeker@careerai.local | Seeker12345 |

## API endpoints

All endpoints except register and login need `Authorization: Bearer <JWT>`.

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | – | Create account (`is_employer` optional), returns JWT |
| POST | `/api/login` | – | Log in, returns JWT (403 if deactivated) |
| POST | `/api/refresh` | expired token | Swap an expired token for a new one (the frontend does this automatically) |
| GET | `/api/me` | any | Current user |
| POST | `/api/logout` | any | Invalidate token |
| POST | `/api/upload-resume` | seeker | Upload PDF, run analysis, store full report |
| POST | `/api/resume/analyze` | seeker | Analyse pasted resume text against a job description |
| GET | `/api/resume/history` | seeker | Past analyses with full reports |
| GET | `/api/resume/{id}` | seeker | One analysis |
| GET | `/api/resume/{id}/file` | seeker | Download the original PDF |
| DELETE | `/api/resume/{id}` | seeker | Delete an analysis and its file |
| GET | `/api/analytics`, `/analytics/career-distribution`, `/analytics/score-history` | seeker | Dashboard stats |
| GET | `/api/jobs?q=&employment_type=&experience_level=&source=` | seeker | Search approved, active jobs |
| GET | `/api/jobs/recommended` | seeker | Jobs ranked by overlap with the latest resume's skills |
| GET | `/api/jobs/saved` | seeker | Saved jobs |
| GET | `/api/jobs/{id}` | seeker | Job detail with company profile and apply flags |
| POST / DELETE | `/api/jobs/{id}/save` | seeker | Save / unsave |
| POST | `/api/jobs/{id}/apply` | seeker | Apply (attaches latest resume) |
| GET | `/api/applications`, `/applications/summary`, `/applications/{id}` | seeker | Track applications |
| PATCH | `/api/applications/{id}/withdraw` | seeker | Withdraw |
| GET / POST / PATCH | `/api/employer/profile` | employer | Company profile |
| GET | `/api/employer/dashboard` | employer | Employer stats |
| GET / POST | `/api/employer/jobs` | approved employer | List / post jobs |
| GET / PATCH / DELETE | `/api/employer/jobs/{id}` | approved employer | View / edit / delete a job |
| PATCH | `/api/employer/jobs/{id}/close` | approved employer | Close a job |
| GET | `/api/employer/jobs/{id}/applicants` | employer | Applicants ranked by AI match score (each application is scored right after it is submitted) |
| POST | `/api/employer/jobs/{id}/applicants/score-all` | employer | Re-score everyone |
| POST | `/api/employer/jobs/{id}/applicants/{appId}/score` | employer | Re-score one applicant |
| PATCH | `/api/employer/jobs/{id}/applicants/{appId}/status` | employer | applied, shortlisted, interview, selected, rejected |
| GET | `/api/employer/jobs/{id}/applicants/{appId}/resume` | employer | Download the applicant's resume PDF |
| GET | `/api/admin/dashboard` | admin | System-wide stats and charts data |
| GET / PATCH / DELETE | `/api/admin/users`, `/admin/users/{id}` | admin | Search, filter, change role, delete |
| PATCH | `/api/admin/users/{id}/activate`, `/deactivate` | admin | Lock or unlock an account |
| GET | `/api/admin/employers?status=&search=` | admin | Employer accounts |
| PATCH | `/api/admin/employers/{id}/approve`, `/reject` | admin | Employer approval |
| GET | `/api/admin/jobs?status=&source=&q=` | admin | All jobs for moderation |
| PATCH | `/api/admin/jobs/{id}/approve`, `/reject` | admin | Moderate a job |
| DELETE | `/api/admin/jobs/{id}` | admin | Remove a job |
| GET | `/api/admin/feed` | admin | External job counts per source |
| POST | `/api/admin/jobs/refresh` | admin | Import jobs from WeWorkRemotely, RemoteOK and Adzuna (if keys are set) |

AI service (internal, called only by Laravel): `POST /analyze`, `POST /match`, `GET /jobs/feed`, `GET /health`.

## Retraining the career model

```bash
cd backend/ai-service
./venv/bin/python train_model.py
```

It trains on three files in `backend/ai-service/dataset/`:

- `careers_djinni.csv`: 13,012 real anonymised CVs from the [Djinni Recruitment Dataset](https://huggingface.co/datasets/lang-uk/recruitment-dataset-candidate-profiles-english) (MIT licence; Drushchak and Romanyshyn, *Introducing the Djinni Recruitment Dataset*, UNLP @ LREC-COLING 2024), mapped to our 25 careers.
- `careers_curated.csv`: clean examples built from the career skill map in `skills_db.py`.
- `careers.csv`: the original Kaggle career data.

The script holds out 20% of the real CVs, prints accuracy on them (currently **86.1%**, macro F1 0.83), then trains the final model on everything. Restart the AI service afterwards.

To rebuild `careers_djinni.csv` from the source dataset:

```bash
cd backend/ai-service
curl -L -o dataset/raw/djinni_cvs.parquet \
  https://huggingface.co/datasets/lang-uk/recruitment-dataset-candidate-profiles-english/resolve/main/data/train-00000-of-00001.parquet
./venv/bin/pip install pyarrow
./venv/bin/python dataset/build_djinni.py
```

## Deploying

- Set `APP_DEBUG=false` and a real `APP_URL` in `backend/laravel-api/.env`. With debug on, error pages expose stack traces.
- Build the frontend with `VITE_API_URL` pointing at the API (see `frontend/.env.example`). Without it the build falls back to `http://localhost:8000/api`.
- The frontend uses client-side routing, so the web server must serve `index.html` for unknown paths (for example `try_files $uri /index.html;` in Nginx), or deep links like `/jobs/12` will 404 on refresh.
- `APP_LOCAL_TIMEZONE` (default `Asia/Kathmandu`) decides when application deadlines end.

## Troubleshooting

- **Login returns an error / nothing happens** — the JWT secret is missing. Run
  `php artisan jwt:secret` in `backend/laravel-api`.
- **"Failed to extract text from PDF: The required binary was not found"** — poppler
  is not installed. Install it (see Prerequisites) so `pdftotext` is on your PATH, or set
  `PDFTOTEXT_PATH` in `backend/laravel-api/.env` to the full path of the binary (needed on Windows).
- **AI service won't start / import errors** — recreate the venv. A venv is
  not portable across machines; delete `backend/ai-service/venv` and redo step 1 above.

## Notes

- The database is SQLite (`backend/laravel-api/database/database.sqlite`) — no DB server needed.
- `.env`, `venv/`, `node_modules/`, and `vendor/` are git-ignored and recreated by setup.
