# CivicPulse

CivicPulse is a community issue reporting and municipal response application. Residents can report public space and infrastructure problems, attach a photo, and support reports from neighbours. A staff workspace provides a queue for review, assignment, and status updates.

The repository also retains the original urban risk analytics modules and API. They are supporting analysis tools; community reports are now the primary product workflow.

## Run locally

Use Python 3.10 or newer and Node.js 20 or newer.

### Backend

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:CIVIC_OFFICIAL_TOKEN = "choose-a-long-random-local-token"
uvicorn src.api.main:app --reload
```

The API listens on `http://localhost:8000`; interactive API documentation is at `http://localhost:8000/docs`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). Set `VITE_API_BASE_URL` in a `frontend/.env.local` file if the API is hosted elsewhere. The default API origin is `http://localhost:8000`.

The resident experience is at `/`. The staff workspace is at `/officials`; enter the same `CIVIC_OFFICIAL_TOKEN` configured for the backend. The token stays in the current browser tab.

## Project layout

```text
frontend/               React + TypeScript resident and staff interfaces
src/api/                FastAPI routes, schemas, and community reporting API
src/data/                Synthetic risk data generation and loading
src/analytics/           Trend, forecast, and correlation analysis
src/models/              Risk model training
src/features/            Feature engineering
src/anomaly/             Anomaly detection
src/decision/            Decision recommendations
src/evaluation/          Early warning evaluation
src/explainability/      Risk model explanations
src/simulation/          Intervention scenario simulation
src/weather/             Weather service integration
data/                    Local datasets and SQLite application data
tests/                   Existing automated checks
run_pipeline.py          Risk analytics model pipeline
```

## Community report API

- `GET /community/reports` lists reports, support totals, and aggregate counts.
- `POST /community/reports` creates a report (multipart form; photo optional).
- `POST /community/reports/{id}/support` toggles support for a browser resident ID.
- `GET /community/reports/{id}/updates` lists staff updates.
- `PATCH /community/reports/{id}/status` updates status and assignment; requires the official bearer token.

Reports are stored in `data/community_reports.sqlite3`; uploaded photos are stored in `data/community_uploads/`. Both are local runtime data and are excluded from version control. Photos are limited to 5 MB and must be valid JPEG, PNG, or WebP files. Report text, rate-limited submissions, and support actions have size or frequency bounds.

## Security and deployment notes

Official status changes fail closed unless `CIVIC_OFFICIAL_TOKEN` is configured. Use a unique, high-entropy secret and keep it out of source control. CORS defaults to the local Vite origins; set `CIVIC_CORS_ORIGINS` to a comma-separated allowlist for a deployment. The API applies basic security response headers and request rate limits.

This is a local major-project implementation, not a production identity service. Resident support is deduplicated by a browser-generated identifier, which is useful for a prototype but is not proof of a unique person. A public deployment should add verified resident and staff accounts, persistent rate limiting, image re-encoding and malware scanning, HTTPS, backups, moderation and privacy retention controls, and department-specific authorization. Do not use the shared-token staff flow as a substitute for an identity provider in a real municipal deployment.

The risk analytics data generator produces synthetic demonstration data. Risk scores and synthetic examples must not be represented as verified real-world conditions.
