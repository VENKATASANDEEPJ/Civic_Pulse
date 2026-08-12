# 🚨 CIVIC-PULSE

### Urban Risk Intelligence & Early Warning System

**CIVIC-PULSE** is a data-driven urban intelligence platform designed to identify emerging civic and infrastructure risks **before they become major incidents**.

Instead of reacting to problems after they occur, CIVIC-PULSE analyzes **spatiotemporal patterns, anomaly signals, environmental conditions, historical trends, and incident activity** to estimate risk at the geographic-zone level.

> **Detect → Predict → Explain → Recommend → Simulate**

---

## 🎯 Problem

Urban problems rarely appear as a single obvious event.

A potential flooding or infrastructure failure may first appear as:

* Increasing civic complaints
* Unusual incident frequency
* Geographic clustering
* Weather anomalies
* Increasing resolution delays
* Deviation from historical patterns

Individually, these signals may look insignificant.

**CIVIC-PULSE combines them to detect emerging patterns and generate early warnings.**

---

## 💡 What Makes CIVIC-PULSE Different?

This is not simply a prediction model or visualization dashboard.

The system combines multiple layers of data science:

| Capability               | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| 📊 Feature Engineering   | Convert raw civic signals into meaningful risk indicators |
| 🔎 Anomaly Detection     | Detect unusual changes in activity                        |
| 🤖 ML Risk Prediction    | Estimate probability/severity of emerging incidents       |
| 🗺️ Geospatial Analytics | Identify geographic hotspots and neighboring risk         |
| ⏱️ Time-Series Analysis  | Detect trends, seasonality and abnormal changes           |
| 🧠 Explainable AI        | Understand why a zone received its risk score             |
| ⚠️ Early Warning         | Measure how early risks can be detected                   |
| 🧪 What-If Simulation    | Explore potential intervention scenarios                  |
| 🎯 Decision Engine       | Convert predictions into actionable recommendations       |

---

# 🏗️ System Architecture

```text
                 CIVIC-PULSE
                      │
                      ▼
              ┌───────────────┐
              │   Data Layer  │
              │               │
              │ Complaints    │
              │ Incidents     │
              │ Weather       │
              │ Infrastructure│
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ Data Pipeline │
              │               │
              │ Cleaning      │
              │ Validation    │
              │ Aggregation   │
              │ Feature Eng.  │
              └───────┬───────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Anomaly      ML Risk     Time-Series
      Detection   Prediction    Analysis
          │           │           │
          └───────────┼───────────┘
                      ▼
              ┌───────────────┐
              │ Explainability│
              │     SHAP      │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ Decision Engine│
              └───────┬───────┘
                      │
              ┌───────┴────────┐
              ▼                ▼
        Recommendations   What-If Simulator
              │                │
              └───────┬────────┘
                      ▼
              ┌───────────────┐
              │   Dashboard   │
              └───────────────┘
```

---

# 🔬 Data Science Pipeline

### 1. Data Generation / Ingestion

CIVIC-PULSE supports reproducible datasets representing:

* Civic complaints
* Infrastructure incidents
* Weather conditions
* Geographic zones
* Historical incident activity
* Severity
* Resolution patterns

Synthetic data can be generated when public datasets are unavailable, with realistic temporal, geographic and correlated patterns.

---

### 2. Feature Engineering

The system derives features such as:

```text
complaint_velocity
complaint_acceleration
complaint_density
rolling_7_day_average
rolling_30_day_baseline
rainfall_anomaly
incident_frequency
incident_severity_index
neighbor_risk
seasonal_index
recurrence_score
resolution_delay
infrastructure_stress_score
```

These features transform raw observations into signals that ML models can use to identify emerging risk.

---

### 3. Anomaly Detection

CIVIC-PULSE detects unusual activity using:

* Statistical baseline analysis
* Isolation Forest

Examples include:

* Sudden complaint spikes
* Unusual incident frequency
* Geographic hotspots
* Abnormal temporal activity

---

### 4. Machine Learning

Multiple models are evaluated rather than assuming one model is optimal.

Current pipeline supports models such as:

* Logistic Regression
* Random Forest
* Gradient Boosting / XGBoost where appropriate

Evaluation includes:

* Precision
* Recall
* F1-score
* ROC-AUC
* PR-AUC
* Confusion Matrix
* Calibration analysis where applicable

Temporal validation is preferred to reduce data leakage.

---

# ⏱️ Early Warning Intelligence

One of the key objectives of CIVIC-PULSE is not merely predicting an incident, but predicting it **early enough to matter**.

The system therefore evaluates:

### Early Warning Lead Time

```text
Incident occurs
      ▲
      │
      │       Early warning
      │             ▲
──────┼─────────────┼────────────────► Time
      │             │
     Day 0        Day -N
```

Important evaluation metrics include:

* Detection rate
* False alarm rate
* Average lead time
* Median lead time

This allows the project to answer a more meaningful question:

> **"How much earlier could we detect the problem?"**

---

# 🧠 Explainable AI

A prediction without an explanation is difficult to trust.

CIVIC-PULSE integrates model explainability to identify the factors contributing to each prediction.

Example:

```text
ZONE: Central District

Risk Score: 87 / 100
Risk Level: HIGH

Top Contributors:

↑ Complaint velocity       +42%
↑ Rainfall anomaly         +31%
↑ Drainage incidents       +28%
↑ Historical recurrence    +19%
```

The system translates these signals into human-readable explanations.

> Important: model contribution is not treated as proof of causation.

---

# 🧪 What-If Simulation

CIVIC-PULSE includes a model-based scenario simulator.

Users can explore scenarios such as:

* Reduced incident frequency
* Faster maintenance response
* Infrastructure intervention
* Increased response-team deployment

Example:

```text
Current Risk
     82
      │
      ▼
Scenario:
25% reduction in incident activity
      │
      ▼
Simulated Risk
     67
```

The simulator is explicitly presented as **scenario analysis**, not causal inference.

---

# 🎯 Decision Support

Predictions are converted into practical recommendations.

Example:

```text
CRITICAL
→ Immediate infrastructure inspection

HIGH
→ Targeted inspection within 24–48 hours

WATCH
→ Increase monitoring frequency

LOW
→ No immediate intervention required
```

Recommendations are influenced by the risk level and contributing factors.

---

# 🖥️ Dashboard

The frontend provides an operational intelligence interface containing:

### Overview

* Overall city risk
* High-risk zones
* Active anomalies
* Early-warning statistics

### Risk Map

* Geographic risk visualization
* Zone-level analysis
* Hotspot detection

### Risk Analysis

* Historical risk
* Contributing factors
* Anomalies
* Model explanation

### Early Warnings

* Emerging risks
* Severity
* Detection information

### What-If Simulator

* Scenario configuration
* Baseline vs simulated risk
* Risk difference

### Model Intelligence

* Model comparison
* Evaluation metrics
* Feature importance
* Explainability

### Data Explorer

* Dataset filtering
* Geographic filtering
* Temporal analysis

---

# 🛠️ Technology Stack

### Data Science

* Python
* Pandas
* NumPy
* Scikit-learn
* GeoPandas
* SHAP

### Machine Learning

* Logistic Regression
* Random Forest
* Gradient Boosting
* Isolation Forest

### Backend

* FastAPI
* Pydantic

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Interactive visualization

### Testing

* Pytest

### Data Storage

* SQLite / local data files

---

# 📁 Project Structure

```text
Civic_Pulse/
│
├── data/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types.ts
│   ├── package.json
│   └── vite.config.ts
│
├── src/
│   ├── anomaly/
│   ├── api/
│   ├── config.py
│   ├── data/
│   ├── decision/
│   ├── evaluation/
│   ├── explainability/
│   ├── features/
│   ├── models/
│   └── simulation/
│
├── tests/
│   ├── test_api.py
│   ├── test_data.py
│   ├── test_features.py
│   ├── test_models.py
│   └── test_simulation.py
│
├── requirements.txt
├── run_pipeline.py
└── README.md
```

---

# ⚙️ Installation

## 1. Clone the repository

```bash
git clone https://github.com/VENKATASANDEEPJ/Civic_Pulse.git
cd Civic_Pulse
```

## 2. Create a Python environment

```bash
python -m venv .venv
```

### Windows

```bash
.venv\Scripts\activate
```

### Linux / macOS

```bash
source .venv/bin/activate
```

---

## 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

---

## 4. Run the data pipeline

```bash
python run_pipeline.py
```

---

## 5. Start the backend

Use the project's FastAPI entry point and start the development server.

Example:

```bash
uvicorn src.api.main:app --reload
```

---

## 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will provide the CIVIC-PULSE dashboard.

---

# 🧪 Testing

Run:

```bash
pytest
```

The test suite covers:

* Data validation
* Feature engineering
* Model behavior
* API functionality
* Scenario simulation

---

# 📈 Model Evaluation

Model performance is generated from the actual training/evaluation pipeline.

No performance numbers are hard-coded into the project.

The final model should be selected based on:

1. Predictive performance
2. Recall for important incidents
3. Precision / false alarm trade-off
4. Temporal generalization
5. Interpretability
6. Operational usefulness

---

# 🔐 Scientific Integrity

CIVIC-PULSE follows several principles:

* No fabricated model metrics
* No fabricated datasets
* Synthetic data is explicitly identified
* Correlation is not presented as causation
* Scenario simulation is not presented as causal inference
* Model limitations are documented
* Evaluation is based on reproducible experiments

---

# 🚧 Current Limitations

CIVIC-PULSE is currently a research/portfolio prototype.

Potential limitations include:

* Synthetic data may not fully represent real-world urban behavior
* Public civic datasets may have reporting bias
* Geographic coverage depends on available data
* Scenario simulation does not establish causal effects
* Model performance depends heavily on data quality

---

# 🔮 Future Development

Potential future versions could integrate:

* Real municipal open-data feeds
* Live weather APIs
* Real-time event ingestion
* Satellite imagery
* Traffic data
* IoT infrastructure sensors
* Graph neural networks for spatial relationships
* Advanced spatiotemporal forecasting
* Causal inference for intervention evaluation
* Multi-city benchmarking
* Automated alerting for high-risk zones

---

# 🌍 Real-World Vision

The long-term goal of CIVIC-PULSE is to move urban analytics from:

**Reactive**

> "A problem has happened. Respond to it."

towards:

**Predictive**

> "The signals suggest a problem is emerging."

and ultimately:

**Preventive**

> "The risk is increasing. Take action before the incident occurs."

---

# 👨‍💻 Author

**J V Sandeep**

B.Tech — Computer Science & Data Science

Interested in:

* Data Science
* Applied AI
* Machine Learning
* Intelligent Systems
* Real-world problem solving

---

## ⭐ Why This Project Matters

CIVIC-PULSE is built around a simple idea:

> **Data becomes truly valuable when it helps people make better decisions before problems become expensive.**

If you find the project interesting, consider giving the repository a ⭐.
