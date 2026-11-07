import io
import os
from datetime import datetime
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional, Any, TYPE_CHECKING
from src.api.schemas import SimulationRequest, AlertActionRequest
from src.weather.service import get_weather_service
from src.analytics.engine import TrendAnalyzer, RiskForecaster, CorrelationAnalyzer
from src.config import URBAN_ZONES
from src.api.community import router as community_router

if TYPE_CHECKING:
    from src.api.services import CivicPulseService

app = FastAPI(
    title="CIVIC-PULSE Operational Risk Intelligence API",
    description="Urban Infrastructure Early Warning & Decision Intelligence System",
    version="2.0.0",
)

allowed_origins = [origin.strip() for origin in os.getenv("CIVIC_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

app.include_router(community_router)

_service: Optional["CivicPulseService"] = None


def get_service() -> "CivicPulseService":
    global _service
    if _service is None:
        # Keep community reporting available when analytics-only dependencies are not installed.
        from src.api.services import CivicPulseService
        _service = CivicPulseService()
    return _service


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {
        "status": "HEALTHY",
        "system": "CIVIC-PULSE",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/overview")
def get_overview(
    zone_id: Optional[str] = Query(None, description="Optional zone ID filter"),
    risk_level: Optional[str] = Query(None, description="Optional risk classification filter"),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
) -> Dict[str, Any]:
    return get_service().get_overview(
        zone_id=zone_id,
        risk_level=risk_level,
        start_date=start_date,
        end_date=end_date,
    )


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
        "watch_count": ov["watch_zones_count"],
        "low_count": ov["low_risk_zones_count"],
        "zones": ov["zones_summary"],
    }


@app.get("/warnings")
def get_warnings(
    status: Optional[str] = Query(None, description="Status filter: ALL, ACTIVE, ACKNOWLEDGED, RESOLVED"),
    severity: Optional[str] = Query(None, description="Severity filter: ALL, CRITICAL, HIGH, WATCH"),
    zone_id: Optional[str] = Query(None, description="Zone ID filter"),
    search: Optional[str] = Query(None, description="Search keyword in zone name, driver, or alert ID"),
) -> Dict[str, Any]:
    return get_service().get_early_warnings(
        status=status,
        severity=severity,
        zone_id=zone_id,
        search=search,
    )


@app.post("/warnings/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, req: Optional[AlertActionRequest] = None) -> Dict[str, Any]:
    notes = req.notes if req else None
    try:
        updated = get_service().acknowledge_alert(alert_id, notes=notes)
        return {
            "status": "SUCCESS",
            "message": f"Alert '{alert_id}' marked as ACKNOWLEDGED.",
            "alert": updated,
        }
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")


@app.post("/warnings/{alert_id}/resolve")
def resolve_alert(alert_id: str, req: Optional[AlertActionRequest] = None) -> Dict[str, Any]:
    notes = req.notes if req else None
    try:
        updated = get_service().resolve_alert(alert_id, notes=notes)
        return {
            "status": "SUCCESS",
            "message": f"Alert '{alert_id}' marked as RESOLVED.",
            "alert": updated,
        }
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")


@app.get("/anomalies")
def get_anomalies(
    zone_id: Optional[str] = Query(None),
) -> Dict[str, Any]:
    srv = get_service()
    df_l = srv.latest_zone_risks
    if zone_id and zone_id != "ALL":
        df_l = df_l[df_l["zone_id"] == zone_id]

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
        return get_service().simulate_scenario(req.model_dump())
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Zone '{req.zone_id}' not found.")


@app.get("/scenarios/history")
def get_scenario_history(limit: int = Query(15, ge=1, le=50)) -> List[Dict[str, Any]]:
    return get_service().get_scenario_history(limit=limit)


@app.get("/data/summary")
def get_data_summary() -> Dict[str, Any]:
    srv = get_service()
    df = srv.df_raw
    valid, issues = srv.loader.validate_dataset(df)
    meta = srv.loader.get_metadata()
    return {
        "total_rows": len(df),
        "total_zones": df["zone_id"].nunique(),
        "date_min": df["date"].min().strftime("%Y-%m-%d"),
        "date_max": df["date"].max().strftime("%Y-%m-%d"),
        "total_incidents_recorded": int(df["incident_occurred"].sum()),
        "is_schema_valid": valid,
        "validation_issues": issues,
        "data_mode": meta.get("mode", "Demonstration Mode"),
        "data_provenance": meta.get("source_description", "Reproducible Synthetic Generator (Seed 42) + Storm Dynamics"),
        "is_synthetic": bool(meta.get("is_synthetic", 1)),
        "last_processed_at": meta.get("last_processed_at", ""),
    }


@app.get("/data/records")
def get_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
    zone_id: Optional[str] = Query(None),
    sort_by: str = Query("date"),
    sort_desc: bool = Query(True),
    search: Optional[str] = Query(None),
) -> Dict[str, Any]:
    return get_service().loader.get_records(
        page=page,
        page_size=page_size,
        zone_id=zone_id,
        sort_by=sort_by,
        sort_desc=sort_desc,
        search=search,
    )


@app.post("/data/validate-csv")
async def validate_csv(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")

    content = await file.read()
    try:
        df_upload = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unable to parse CSV file: {str(e)}")

    valid, issues = get_service().loader.validate_dataset(df_upload)

    # Preview sample
    sample_preview = df_upload.head(5).to_dict(orient="records")

    return {
        "filename": file.filename,
        "is_valid": valid,
        "issues": issues,
        "total_rows": len(df_upload),
        "columns_found": list(df_upload.columns),
        "sample_preview": sample_preview,
    }


@app.post("/data/upload-csv")
async def upload_csv(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")

    content = await file.read()
    try:
        df_upload = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unable to parse CSV file: {str(e)}")

    try:
        res = get_service().import_csv_dataset(df_upload)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@app.post("/data/reset")
def reset_dataset() -> Dict[str, Any]:
    return get_service().reset_demonstration_data()


@app.get("/data/export-csv")
def export_csv(
    zone_id: Optional[str] = Query(None),
) -> StreamingResponse:
    srv = get_service()
    df = srv.df_raw.copy()
    if zone_id and zone_id != "ALL":
        df = df[df["zone_id"] == zone_id]

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    stream.seek(0)

    filename = f"civic_pulse_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


@app.get("/reports/generate")
def generate_report(
    zone_id: str = Query(..., description="Target urban zone ID"),
    assessment_period: Optional[str] = Query(None, description="Assessment timeframe description"),
) -> Dict[str, Any]:
    try:
        return get_service().generate_report(zone_id=zone_id, assessment_period=assessment_period)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")


# ===================================================================
# NEW: Weather Intelligence Endpoints
# ===================================================================


@app.get("/weather/current")
def get_current_weather() -> Dict[str, Any]:
    """Fetches real-time weather conditions for the metropolitan area."""
    weather_svc = get_weather_service()
    result = weather_svc.get_weather_for_all_zones(URBAN_ZONES)
    return result


@app.get("/weather/forecast")
def get_weather_forecast() -> Dict[str, Any]:
    """Fetches 7-day weather forecast with flood risk indicators."""
    weather_svc = get_weather_service()
    # Use the first zone's centroid as the metro representative
    lat = URBAN_ZONES[0]["centroid"][0]
    lon = URBAN_ZONES[0]["centroid"][1]
    forecast = weather_svc.get_7day_forecast(lat, lon)
    if forecast:
        return {"status": "LIVE", "forecast": forecast}
    return {"status": "API_UNAVAILABLE", "forecast": None}


# ===================================================================
# NEW: Advanced Analytics Endpoints
# ===================================================================


@app.get("/analytics/trends/{zone_id}")
def get_zone_trends(zone_id: str) -> Dict[str, Any]:
    """
    Computes multi-horizon trend analysis for a specific zone.
    Returns directional trends, rate of change, and descriptive statistics.
    """
    srv = get_service()
    df = srv.df_features.copy()

    # Add risk scores
    X_all = df[srv.model_artifact["feature_names"]]
    df["risk_score"] = np.round(srv.model_artifact["model"].predict_proba(X_all)[:, 1] * 100.0, 1)

    result = TrendAnalyzer.compute_zone_trends(df, zone_id)
    if result.get("status") == "NO_DATA":
        raise HTTPException(status_code=404, detail=f"No data found for zone '{zone_id}'.")
    return result


@app.get("/analytics/city-trends")
def get_city_trends() -> Dict[str, Any]:
    """
    Computes city-wide aggregate trends across all zones.
    """
    srv = get_service()
    return TrendAnalyzer.compute_city_trends(srv.df_features)


@app.get("/analytics/forecast/{zone_id}")
def get_zone_forecast(
    zone_id: str,
    horizon_days: int = Query(7, ge=1, le=14),
) -> Dict[str, Any]:
    """
    Generates risk forecast for a zone using exponential smoothing.
    Returns predicted risk scores with confidence intervals.
    """
    srv = get_service()
    df = srv.df_features.copy()
    result = RiskForecaster.forecast_zone_risk(df, zone_id, srv.model_artifact, horizon_days)
    if result.get("status") == "INSUFFICIENT_DATA":
        raise HTTPException(status_code=400, detail=f"Insufficient data for zone '{zone_id}' forecasting.")
    if result.get("status") == "MODEL_ERROR":
        raise HTTPException(status_code=500, detail="Model error during forecasting.")
    return result


@app.get("/analytics/correlations")
def get_risk_correlations() -> Dict[str, Any]:
    """
    Computes pairwise correlations between urban risk factors.
    """
    srv = get_service()
    return CorrelationAnalyzer.compute_risk_correlations(srv.df_raw)


@app.get("/analytics/zone-comparison")
def get_zone_comparison(
    zone_ids: str = Query(..., description="Comma-separated zone IDs to compare"),
) -> Dict[str, Any]:
    """
    Compares multiple zones across key risk metrics.
    """
    srv = get_service()
    requested_ids = [z.strip() for z in zone_ids.split(",")]
    comparison = []

    for zid in requested_ids:
        if zid in srv.zone_cache:
            z = srv.zone_cache[zid]
            comparison.append({
                "zone_id": zid,
                "name": z["name"],
                "type": z["type"],
                "risk_score": z["risk_score"],
                "risk_level": z["risk_level"],
                "rainfall_mm": z["rainfall_mm"],
                "total_complaints": z["total_complaints"],
                "infra_stress_score": z["infra_stress_score"],
                "top_driver": z["top_driver"],
            })

    if not comparison:
        raise HTTPException(status_code=404, detail="No valid zones found in comparison request.")

    # Ranking
    comparison.sort(key=lambda x: x["risk_score"], reverse=True)
    for i, c in enumerate(comparison):
        c["rank"] = i + 1

    return {
        "zones_compared": len(comparison),
        "highest_risk": comparison[0] if comparison else None,
        "lowest_risk": comparison[-1] if comparison else None,
        "average_risk": round(float(np.mean([c["risk_score"] for c in comparison])), 1),
        "comparison": comparison,
    }


@app.get("/analytics/risk-timeline")
def get_risk_timeline(
    zone_id: Optional[str] = Query(None),
    days: int = Query(30, ge=7, le=180),
) -> Dict[str, Any]:
    """
    Returns historical risk timeline data for charting.
    Aggregates by day across all zones or for a specific zone.
    """
    srv = get_service()
    df = srv.df_features.copy()

    # Add risk scores
    X_all = df[srv.model_artifact["feature_names"]]
    df["risk_score"] = np.round(srv.model_artifact["model"].predict_proba(X_all)[:, 1] * 100.0, 1)

    latest_date = df["date"].max()
    cutoff = latest_date - pd.Timedelta(days=days)
    df = df[df["date"] > cutoff]

    if zone_id and zone_id != "ALL":
        df = df[df["zone_id"] == zone_id]
        timeline = []
        for _, row in df.sort_values("date").iterrows():
            timeline.append({
                "date": row["date"].strftime("%Y-%m-%d"),
                "risk_score": float(row["risk_score"]),
                "rainfall_mm": float(row["rainfall_mm"]),
                "total_complaints": int(row["total_complaints"]),
                "infra_stress_score": float(row["infra_stress_score"]),
                "incident_occurred": int(row["incident_occurred"]),
            })
    else:
        # Aggregate across all zones
        agg = df.groupby("date").agg({
            "risk_score": "mean",
            "rainfall_mm": "mean",
            "total_complaints": "sum",
            "infra_stress_score": "mean",
            "incident_occurred": "sum",
        }).reset_index().sort_values("date")

        timeline = []
        for _, row in agg.iterrows():
            timeline.append({
                "date": row["date"].strftime("%Y-%m-%d"),
                "risk_score": round(float(row["risk_score"]), 1),
                "rainfall_mm": round(float(row["rainfall_mm"]), 1),
                "total_complaints": int(row["total_complaints"]),
                "infra_stress_score": round(float(row["infra_stress_score"]), 1),
                "incident_occurred": int(row["incident_occurred"]),
            })

    return {
        "zone_id": zone_id or "ALL",
        "days": days,
        "data_points": len(timeline),
        "timeline": timeline,
    }
