# CivicPulse

**Your City. In The Loop.**

CivicPulse is a community issue reporting and municipal response platform designed to connect residents with the people responsible for improving their city.

Residents can report local problems, attach photographs, support reports from neighbours, and track progress. City officials can review submissions, assign responsible teams, update statuses, and communicate progress.

Beyond community reporting, CivicPulse also incorporates an Urban Risk Intelligence system that uses data science, machine learning, and geospatial analytics to identify emerging infrastructure risks.

**Report → Analyze → Prioritize → Respond → Improve**

---

## Features

### 1. Community Reporting
- Submit public issue reports with optional photographs.
- Browse, search, sort, and filter community reports.
- Explore issues by category.
- Support reports submitted by other residents.
- Track report status and official progress updates.

### 2. Municipal Staff Workspace
- Dedicated staff interface.
- Review and manage community submissions.
- Assign responsible teams.
- Update report statuses.
- Publish progress updates for residents.

### 3. Urban Risk Intelligence
- Urban infrastructure risk analysis.
- Geographic risk visualization.
- Historical trend analysis.
- Anomaly detection.
- Weather-related risk indicators.
- Risk forecasting and scenario simulation.

### 4. Data Science and Machine Learning
- Data generation and preprocessing.
- Feature engineering.
- Machine learning model training.
- Model evaluation and comparison.
- Explainable AI.
- Early-warning analysis.
- What-if scenario simulation.

---

## Technology Stack

**Frontend**
- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- Lucide Icons
- Recharts
- Leaflet and React Leaflet
- Axios

**Backend**
- Python
- FastAPI
- Uvicorn
- Pydantic
- Python Multipart

**Data Science and Machine Learning**
- Pandas
- NumPy
- Scikit-learn
- SciPy
- Shapely
- Joblib

**Storage**
- SQLite
- Local file storage
- Browser Local Storage
- Browser Session Storage

---

## System Architecture

```text
                 CIVICPULSE
                     |
          +----------+----------+
          |                     |
          v                     v
   COMMUNITY PLATFORM     RISK INTELLIGENCE
          |                     |
   Resident Interface     Data Processing
          |                     |
   Community Reports      Feature Engineering
          |                     |
   Staff Workspace        ML & Analytics
          |                     |
   Status Updates         Risk Evaluation
          |                     |
          +----------+----------+
                     |
                     v
              DECISION SUPPORT
                     |
                     v
             Better City Response
```

---

## Run Locally

### Prerequisites

- Python 3.10 or newer
- Node.js 20 or newer
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/VENKATASANDEEPJ/Civic_Pulse.git
cd Civic_Pulse
```

### 2. Set Up the Backend

Create a virtual environment:

```powershell
py -m venv .venv
```

Activate it:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Configure the staff access token:

```powershell
$env:CIVIC_OFFICIAL_TOKEN = "set-a-long-random-local-token"
```

Start the backend:

```powershell
uvicorn src.api.main:app --reload
```

Backend:

`http://localhost:8000`

Interactive API documentation:

`http://localhost:8000/docs`

### 3. Set Up the Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite address displayed in the terminal, usually:

`http://localhost:5173`

### Application Routes

| Route | Description |
|---|---|
| `/` | Resident community platform |
| `/officials` | Municipal staff workspace |

Staff operations require the token configured through `CIVIC_OFFICIAL_TOKEN`.

---

## Community Report API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/community/reports` | Retrieve community reports |
| POST | `/community/reports` | Submit a new report |
| POST | `/community/reports/{id}/support` | Support or remove support |
| GET | `/community/reports/{id}/updates` | Retrieve report updates |
| PATCH | `/community/reports/{id}/status` | Update report status |

The staff status endpoint requires authorized bearer-token access.

---

## Data Storage

Community reports are stored in:

```text
data/community_reports.sqlite3
```

Uploaded photographs are stored in:

```text
data/community_uploads/
```

Image uploads:
- JPEG, PNG, and WebP formats.
- Maximum file size: 5 MB.

Community report databases and uploaded media are local runtime data and are excluded from version control.

The urban risk analytics module also uses local datasets and SQLite application data.

**Data integrity:** Risk analytics demonstration data is synthetic and must not be interpreted as verified real-world municipal conditions.

---

## Project Structure

```text
Civic_Pulse/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── App.tsx
│       ├── api.ts
│       └── types.ts
│
├── src/
│   ├── analytics/
│   ├── anomaly/
│   ├── api/
│   ├── data/
│   ├── decision/
│   ├── evaluation/
│   ├── explainability/
│   ├── features/
│   ├── models/
│   ├── simulation/
│   └── weather/
│
├── data/
│   ├── models/
│   ├── processed/
│   └── raw/
│
├── tests/
│
├── requirements.txt
├── pytest.ini
├── run_pipeline.py
└── README.md
```

---

## Security Notes

CivicPulse includes several basic security measures:

- Configurable CORS origins.
- Security response headers.
- Request rate limiting.
- Image upload validation.
- Bearer-token protection for staff status changes.

Configure deployment origins using:

```text
CIVIC_CORS_ORIGINS
```

Use a unique, high-entropy staff token and never commit secrets to the repository.

**Important:** CivicPulse is a portfolio and project prototype, not a production municipal identity system.

Resident support currently uses a browser-generated identifier rather than verified identity.

A production deployment should incorporate:
- Verified resident and staff authentication.
- Role-based authorization.
- Persistent rate limiting.
- Image scanning and re-encoding.
- HTTPS and secure backups.
- Report moderation.
- Privacy and data-retention controls.

---

## Testing

Run the automated tests from the project root:

```bash
pytest
```

The repository includes automated API tests and project testing configuration.

---

## Current Limitations

- Risk analytics demonstration data is synthetic.
- Synthetic patterns may not represent actual urban behaviour.
- Geographic accuracy depends on available datasets.
- Resident support does not establish verified identity.
- Scenario simulations should not be interpreted as causal predictions.
- Production deployment requires stronger authentication and operational security.

---

## Future Development

Potential improvements include:

- Integration with real municipal open-data sources.
- Live weather intelligence.
- Verified resident accounts.
- Official department dashboards.
- Real-time civic notifications.
- Advanced geospatial analytics.
- Improved infrastructure risk forecasting.
- Automated municipal response workflows.
- Multi-city support.

---

## Author

**J. Venkata Sandeep**

B.Tech — Computer Science and Data Science

Interests:
- Data Science
- Artificial Intelligence
- Machine Learning
- Intelligent Systems
- Real-world problem solving

---

## Project Vision

CivicPulse aims to make cities more responsive by connecting community participation with intelligent data-driven decision support.

**A better city doesn't start with bigger systems. It starts when people speak up and someone responds.**
