import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
MODEL_DIR = DATA_DIR / "models"
DB_PATH = DATA_DIR / "civic_pulse.db"

# Ensure directories exist
for path in [DATA_DIR, RAW_DATA_DIR, PROCESSED_DATA_DIR, MODEL_DIR]:
    os.makedirs(path, exist_ok=True)

# Random Seed for Reproducibility
RANDOM_SEED = 42

# Time Horizon Config
NUM_DAYS = 180  # 6 months of historical daily/hourly signal data
START_DATE = "2026-01-01"

# Risk Thresholds
RISK_LEVEL_THRESHOLDS = {
    "LOW": (0, 30),
    "WATCH": (30, 60),
    "HIGH": (60, 80),
    "CRITICAL": (80, 100),
}

# Urban Zones Definition (12 Realistic Metropolitan Zones)
URBAN_ZONES = [
    {
        "zone_id": "ZONE-01",
        "name": "Downtown Central",
        "type": "Commercial & High Density",
        "centroid": [37.7749, -122.4194],
        "area_km2": 4.5,
        "base_vulnerability": 0.65,
        "infra_age_years": 45,
    },
    {
        "zone_id": "ZONE-02",
        "name": "Riverfront North",
        "type": "Lowland Floodplain",
        "centroid": [37.7880, -122.4075],
        "area_km2": 6.2,
        "base_vulnerability": 0.82,
        "infra_age_years": 38,
    },
    {
        "zone_id": "ZONE-03",
        "name": "Harborside East",
        "type": "Coastal & Industrial",
        "centroid": [37.7600, -122.3880],
        "area_km2": 8.1,
        "base_vulnerability": 0.75,
        "infra_age_years": 52,
    },
    {
        "zone_id": "ZONE-04",
        "name": "Westside Heights",
        "type": "Residential Hillside",
        "centroid": [37.7550, -122.4500],
        "area_km2": 5.8,
        "base_vulnerability": 0.35,
        "infra_age_years": 25,
    },
    {
        "zone_id": "ZONE-05",
        "name": "Metro Industrial Basin",
        "type": "Heavy Logistics & Industrial",
        "centroid": [37.7300, -122.3900],
        "area_km2": 9.4,
        "base_vulnerability": 0.70,
        "infra_age_years": 48,
    },
    {
        "zone_id": "ZONE-06",
        "name": "Tech Corridor",
        "type": "Mixed Commercial & Residential",
        "centroid": [37.7800, -122.3950],
        "area_km2": 3.9,
        "base_vulnerability": 0.40,
        "infra_age_years": 18,
    },
    {
        "zone_id": "ZONE-07",
        "name": "Southside Valley",
        "type": "Lowland Residential",
        "centroid": [37.7200, -122.4300],
        "area_km2": 7.2,
        "base_vulnerability": 0.68,
        "infra_age_years": 35,
    },
    {
        "zone_id": "ZONE-08",
        "name": "East Basin District",
        "type": "High Density Residential",
        "centroid": [37.7650, -122.4100],
        "area_km2": 5.1,
        "base_vulnerability": 0.62,
        "infra_age_years": 40,
    },
    {
        "zone_id": "ZONE-09",
        "name": "University Campus & Hill",
        "type": "Institutional & Steep Slopes",
        "centroid": [37.7600, -122.4550],
        "area_km2": 4.8,
        "base_vulnerability": 0.38,
        "infra_age_years": 30,
    },
    {
        "zone_id": "ZONE-10",
        "name": "Old Town Cultural Sector",
        "type": "Historic Built Environment",
        "centroid": [37.7950, -122.4050],
        "area_km2": 3.2,
        "base_vulnerability": 0.78,
        "infra_age_years": 65,
    },
    {
        "zone_id": "ZONE-11",
        "name": "Outer Transit Hub",
        "type": "Transportation & Commercial",
        "centroid": [37.7100, -122.4600],
        "area_km2": 6.7,
        "base_vulnerability": 0.50,
        "infra_age_years": 28,
    },
    {
        "zone_id": "ZONE-12",
        "name": "Bayshore Wetlands Margin",
        "type": "Ecological Vulnerable Margin",
        "centroid": [37.7050, -122.3950],
        "area_km2": 11.0,
        "base_vulnerability": 0.85,
        "infra_age_years": 42,
    },
]

# Complaint categories and primary risk maps
COMPLAINT_TYPES = [
    "drainage_clog",
    "pothole_road_damage",
    "waste_accumulation",
    "water_main_leak",
    "sewer_backup",
    "power_grid_flicker",
]

RISK_CATEGORIES = [
    "Flooding & Drainage Failure",
    "Road & Structural Damage",
    "Sanitation & Health Risk",
    "Water & Utility Disruption",
]
