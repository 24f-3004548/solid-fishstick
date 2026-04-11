# CareerSync

A full-stack campus placement management system with role-based dashboards for students, companies, and admins.

## Tech Stack

- Backend: Flask, SQLAlchemy, Flask-JWT-Extended, Flask-Mail
- Async jobs: Celery + Redis
- Frontend: Vue 3 (CDN-based, no Node build step)
- Database: SQLite (default)

## Repository Structure

- `backend/` — Flask API, Celery config/tasks, models, routes, scripts
- `frontend/` — Vue app served as static files
- `uploads/` — generated export files and uploaded content
- `start_all.sh` — one-command local startup (backend + frontend + redis + celery)
- `stop_all.sh` — one-command local shutdown (backend + frontend + redis + celery)
- `setup_alias.sh` — adds a shell alias to start the app quickly

## Prerequisites

- Python 3.10+
- Redis server

macOS install examples:

```bash
brew install redis
```

## Quick Start (Recommended)

From project root:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
./start_all.sh
```

This starts:

- Flask backend
- Frontend static server
- Redis
- Celery worker
- Celery beat

## Manual Start

Open separate terminals from project root:

```bash
source venv/bin/activate
```

1) Backend

```bash
cd backend
python run.py
```

2) Frontend

```bash
cd frontend
python -m http.server 5500
```

3) Redis

```bash
redis-server
```

4) Celery worker

```bash
cd backend
celery -A celery_worker.celery worker -l info
```

5) Celery beat

```bash
cd backend
celery -A celery_worker.celery beat -l info
```

## Create Alias (Optional)

From project root:

```bash
chmod +x setup_alias.sh start_all.sh stop_all.sh
./setup_alias.sh
source ~/.zshrc
```

After that, run everything with:

```bash
careersync-up
```

Stop all CareerSync services with:

```bash
careersync-down
```

## Local URLs and Ports

- Frontend: `http://127.0.0.1:5500`
- Backend API base: `http://127.0.0.1:5001/api`

Default ports:

- Backend API: `5001` (`BACKEND_PORT`)
- Frontend static server: `5500` (`FRONTEND_PORT` in shell before startup)
- Redis: `6379` (`REDIS_URL`)
- SMTP: `587` (`MAIL_PORT`)

## Environment Configuration

Backend environment file is expected at `backend/.env`.

Required keys:

- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Common keys:

- `FLASK_ENV` (default: `development`)
- `BACKEND_PORT` (default: `5001`)
- `FRONTEND_URL` (default: `http://127.0.0.1:5500`)
- `REDIS_URL` (default: `redis://localhost:6379/0`)
- `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_DEFAULT_SENDER`

## Seed Mock Data

Run from project root:

```bash
source venv/bin/activate
python backend/scripts/reset_and_seed_mock_data.py
```

Optional knobs (via env):

- `SEED_STUDENT_COUNT` (default `1000`)
- `SEED_COMPANY_COUNT` (default `15`)

## Notes

- Frontend API target can be overridden in-browser using `window.__API_BASE__` or `window.__API_PORT__`.
- Backend auto-creates DB tables and seeds admin at startup if missing.
- Keep secrets out of git. Never commit `backend/.env` with real credentials.
