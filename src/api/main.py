from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Any
from src.api.schemas import SimulationRequest
from src.api.services import CivicPulseService

app = FastAPI(
    title="CIVIC-PULSE Operational Risk Intelligence API",
    description="Urban Infrastructure Early Warning & Decision Intelligence System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_service: CivicPulseService = None


def get_service() -> CivicPulseService:
    global _service
    if _service is None:
        _service = CivicPulseService()
    return _service


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "HEALTHY", "system": "CIVIC-PULSE", "version": "1.0.0"}


@app.get("/overview")
def get_overview() -> Dict[str, Any]:
    return get_service().get_overview()


@app.get("/zones")
def get_zones() -> List[Dict[str, Any]]:
    return get_service().get_overview()["zones_summary"]


@app.get("/zones/{zone_id}")
def get_zone_detail(zone_id: str) -> Dict[str, Any]:
    try:
        return get_service().get_zone_detail(zone_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")


@app.get("/risks")
def get_risk_matrix() -> Dict[str, Any]:
    ov = get_service().get_overview()
    return {
        "average_risk_score": ov["average_risk_score"],
        "critical_count": ov["critical_zones_count"],
        "high_count": ov["high_risk_zones_count"],
        "zones": ov["zones_summary"],
    }


@app.get("/warnings")
def get_warnings() -> Dict[str, Any]:
    return get_service().get_early_warnings()


@app.get("/anomalies")
def get_anomalies() -> Dict[str, Any]:
    srv = get_service()
    df_l = srv.latest_zone_risks
    anomalies = []
    for _, row in df_l[df_l["iso_anomaly_flag"] == 1].iterrows():
        anomalies.append({
            "zone_id": row["zone_id"],
            "zone_name": row["zone_name"],
            "date": srv.latest_date_str,
            "rainfall_mm": float(row["rainfall_mm"]),
            "complaint_velocity": float(row["complaint_velocity"]),
            "iso_anomaly_score": float(row["iso_anomaly_score"]),
            "stat_anomaly_flag": int(row["stat_anomaly_flag"]),
        })
    return {
        "metrics": srv.anomaly_metrics,
        "detected_anomalies_count": len(anomalies),
        "anomalies": anomalies,
    }


@app.get("/model/metrics")
def get_model_metrics() -> Dict[str, Any]:
    srv = get_service()
    return {
        "evaluation_metrics": srv.eval_metrics,
        "early_warning_lead_time_metrics": srv.early_warning_stats,
        "selected_model": srv.model_artifact["model_name"],
        "feature_list": srv.model_artifact["feature_names"],
    }


@app.get("/model/explanation/{zone_id}")
def get_zone_explanation(zone_id: str) -> Dict[str, Any]:
    try:
        detail = get_service().get_zone_detail(zone_id)
        return detail["explanation"]
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")


@app.post("/simulate")
def run_simulation(req: SimulationRequest) -> Dict[str, Any]:
    try:
        return get_service().simulate_scenario(req.dict())
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Zone '{req.zone_id}' not found.")


@app.get("/data/summary")
def get_data_summary() -> Dict[str, Any]:
    srv = get_service()
    df = srv.df_raw
    valid, issues = srv.loader.validate_dataset(df)
    return {
        "total_rows": len(df),
        "total_zones": df["zone_id"].nunique(),
        "date_min": df["date"].min().strftime("%Y-%m-%d"),
        "date_max": df["date"].max().strftime("%Y-%m-%d"),
        "total_incidents_recorded": int(df["incident_occurred"].sum()),
        "is_schema_valid": valid,
        "validation_issues": issues,
        "data_provenance": "Reproducible Synthetic Generator (Seed 42) + Seeded Storm Dynamics",
    }
