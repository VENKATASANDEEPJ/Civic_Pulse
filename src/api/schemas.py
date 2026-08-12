from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    zone_id: str = Field(..., description="Urban zone ID (e.g. ZONE-01)")
    complaint_reduction_pct: float = Field(0.0, ge=0.0, le=100.0)
    resolution_speedup_pct: float = Field(0.0, ge=0.0, le=100.0)
    infra_investment_delta: float = Field(0.0, ge=0.0, le=50.0)
    drainage_inspection_active: bool = Field(False)


class ZoneRiskSummary(BaseModel):
    zone_id: str
    name: str
    type: str
    area_km2: float
    risk_score: float
    risk_level: str
    rainfall_mm: float
    total_complaints: int
    infra_stress_score: float
    top_driver: str
    recommendation: Dict[str, Any]
    geojson: Dict[str, Any]


class OverviewResponse(BaseModel):
    city_name: str
    total_zones: int
    average_risk_score: float
    critical_zones_count: int
    high_risk_zones_count: int
    active_anomalies_count: int
    early_warning_lead_time_hours: float
    detection_rate_percent: str
    dataset_date_range: str
    zones_summary: List[ZoneRiskSummary]
