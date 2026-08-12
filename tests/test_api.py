import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_api_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"


def test_api_overview():
    response = client.get("/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_zones" in data
    assert data["total_zones"] == 12
    assert "average_risk_score" in data
    assert "zones_summary" in data


def test_api_zones_detail():
    response = client.get("/zones/ZONE-01")
    assert response.status_code == 200
    data = response.json()
    assert data["zone_id"] == "ZONE-01"
    assert "timeline" in data
    assert "explanation" in data
    assert "recommendation" in data


def test_api_warnings():
    response = client.get("/warnings")
    assert response.status_code == 200
    data = response.json()
    assert "early_warning_metrics" in data
    assert "active_warnings" in data


def test_api_simulation():
    payload = {
        "zone_id": "ZONE-01",
        "complaint_reduction_pct": 30.0,
        "resolution_speedup_pct": 20.0,
        "infra_investment_delta": 10.0,
        "drainage_inspection_active": True,
    }
    response = client.post("/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["zone_id"] == "ZONE-01"
    assert "simulated_risk_score" in data
