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
    assert "data_mode" in data
    assert "is_synthetic" in data


def test_api_overview_filters():
    # Test zone filter
    res_zone = client.get("/overview?zone_id=ZONE-01")
    assert res_zone.status_code == 200
    assert res_zone.json()["total_zones"] == 1
    assert res_zone.json()["zones_summary"][0]["zone_id"] == "ZONE-01"

    # Test risk level filter
    res_level = client.get("/overview?risk_level=CRITICAL")
    assert res_level.status_code == 200
    for z in res_level.json()["zones_summary"]:
        assert z["risk_level"] == "CRITICAL"


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


def test_api_alert_acknowledge_and_resolve():
    # Fetch warnings
    res = client.get("/warnings")
    assert res.status_code == 200
    warnings = res.json()["active_warnings"]
    assert len(warnings) > 0
    target_alert_id = warnings[0]["alert_id"]

    # 1. Acknowledge
    ack_res = client.post(f"/warnings/{target_alert_id}/acknowledge", json={"notes": "Inspection team dispatched."})
    assert ack_res.status_code == 200
    assert ack_res.json()["alert"]["status"] == "ACKNOWLEDGED"

    # Verify persistence via get_warnings
    warn_check = client.get(f"/warnings?status=ACKNOWLEDGED")
    assert warn_check.status_code == 200
    ack_ids = [w["alert_id"] for w in warn_check.json()["active_warnings"]]
    assert target_alert_id in ack_ids

    # 2. Resolve
    res_res = client.post(f"/warnings/{target_alert_id}/resolve", json={"notes": "Catch basin cleared."})
    assert res_res.status_code == 200
    assert res_res.json()["alert"]["status"] == "RESOLVED"

    # Verify persistence via get_warnings
    res_check = client.get(f"/warnings?status=RESOLVED")
    assert res_check.status_code == 200
    res_ids = [w["alert_id"] for w in res_check.json()["active_warnings"]]
    assert target_alert_id in res_ids


def test_api_simulation_and_history():
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
    assert "history_id" in data

    # Check scenario history endpoint
    hist_res = client.get("/scenarios/history")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) > 0
    assert history[0]["zone_id"] == "ZONE-01"


def test_api_records_pagination():
    res = client.get("/data/records?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) == 10
    assert data["total"] > 100
    assert data["page"] == 1


def test_api_report_generation():
    res = client.get("/reports/generate?zone_id=ZONE-01&assessment_period=Q2+Operational+Review")
    assert res.status_code == 200
    data = res.json()
    assert "report_title" in data
    assert "ZONE-01" in data["zone_info"]["zone_id"]
    assert "risk_assessment" in data
    assert "recommended_actions" in data
    assert "methodology_summary" in data


def test_api_export_csv():
    res = client.get("/data/export-csv?zone_id=ZONE-01")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment" in res.headers["content-disposition"]
    assert len(res.text) > 100
