import json
import sqlite3
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from shapely.geometry import Point, Polygon
from src.config import (
    BASE_DIR,
    DATA_DIR,
    DB_PATH,
    PROCESSED_DATA_DIR,
    RANDOM_SEED,
    NUM_DAYS,
    START_DATE,
    URBAN_ZONES,
    COMPLAINT_TYPES,
)


class SyntheticDataGenerator:
    """
    Generates realistic, reproducible synthetic time-series urban signal data
    incorporating temporal seasonality, spatial vulnerabilities, weather anomalies,
    complaint spikes, and ground-truth incident events for early warning model evaluation.
    """

    def __init__(self, seed: int = RANDOM_SEED):
        self.seed = seed
        np.random.seed(self.seed)
        self.start_dt = datetime.strptime(START_DATE, "%Y-%m-%d")
        self.zones = URBAN_ZONES

    def generate_zone_polygons(self) -> dict:
        """
        Creates synthetic GeoJSON polygon boundaries around each zone centroid.
        """
        zone_geojson = {}
        for z in self.zones:
            lat, lng = z["centroid"]
            # Create a 4-point polygon box around centroid (approx ~ 1.5 - 2.5 km box)
            offset = 0.015 + np.random.uniform(-0.003, 0.003)
            poly_coords = [
                [lng - offset, lat - offset],
                [lng + offset, lat - offset],
                [lng + offset, lat + offset],
                [lng - offset, lat + offset],
                [lng - offset, lat - offset],
            ]
            zone_geojson[z["zone_id"]] = {
                "type": "Feature",
                "properties": {
                    "zone_id": z["zone_id"],
                    "name": z["name"],
                    "type": z["type"],
                    "area_km2": z["area_km2"],
                    "vulnerability": z["base_vulnerability"],
                    "infra_age": z["infra_age_years"],
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [poly_coords],
                },
            }
        return zone_geojson

    def generate_dataset(self) -> pd.DataFrame:
        """
        Generates daily time-series records per zone across 180 days.
        Total records = 12 zones * 180 days = 2160 rows.
        """
        np.random.seed(self.seed)
        records = []

        date_range = [self.start_dt + timedelta(days=i) for i in range(NUM_DAYS)]

        for day_idx, date_curr in enumerate(date_range):
            # Global weather pattern (Seasonality)
            # Monsoon / Storm peak period 1 (days 35 to 65), peak period 2 (days 120 to 145)
            season_factor = 0.2 + 0.8 * np.sin(2 * np.pi * day_idx / 180)
            
            # Weather events (Storm surges on specific day clusters including current operational horizon)
            is_storm_day = (38 <= day_idx <= 52) or (125 <= day_idx <= 138) or (173 <= day_idx <= 179) or (day_idx in [85, 86, 165])
            
            base_rainfall = 45.0 if is_storm_day else (12.0 * max(0.1, season_factor) + np.random.exponential(4.0))
            if np.random.rand() < 0.15:  # Random isolated rainburst
                base_rainfall += np.random.uniform(15.0, 35.0)

            base_temp = 18.0 + 8.0 * np.sin(2 * np.pi * (day_idx - 30) / 365) + np.random.normal(0, 1.5)

            for z in self.zones:
                zone_id = z["zone_id"]
                vuln = z["base_vulnerability"]
                infra_age = z["infra_age_years"]

                # Zone local rainfall variability
                rainfall = max(0.0, base_rainfall * (0.85 + 0.3 * np.random.rand()))
                
                # Temperature anomaly
                temperature = base_temp + (0.5 if vuln > 0.6 else -0.3)

                # Base complaint rates scaled by zone vulnerability
                base_complaint_count = int(np.random.poisson(lam=5.0 + 10.0 * vuln))

                # If storm or heavy rain occurs in vulnerable zone, complaint volume spikes drastically
                rain_complaint_multiplier = 1.0
                if rainfall > 25.0:
                    rain_complaint_multiplier += (rainfall / 15.0) * vuln * 1.8

                total_complaints = int(base_complaint_count * rain_complaint_multiplier + np.random.negative_binomial(2, 0.4))
                
                # Breakdown into specific complaint types
                drainage_clogs = int(total_complaints * (0.45 * vuln if rainfall > 20 else 0.25))
                potholes = int(total_complaints * (0.35 if infra_age > 35 else 0.20))
                waste_accum = int(total_complaints * 0.15 + np.random.poisson(1))
                water_leaks = int(total_complaints * (0.25 if infra_age > 40 else 0.10))
                sewer_backups = int(total_complaints * (0.20 * vuln if rainfall > 30 else 0.05))
                power_flickers = int(total_complaints * 0.05)

                # Resolution delay (hours) - increases when complaint volume surges or infra is old
                resolution_delay = float(np.round(12.0 + (total_complaints * 0.8) + (infra_age * 0.3) + np.random.normal(0, 3.0), 1))
                resolution_delay = max(4.0, resolution_delay)

                # Infrastructure stress score (0 - 100)
                infra_stress = float(np.clip(30.0 + (vuln * 35.0) + (rainfall * 0.4) + (total_complaints * 0.7) - (resolution_delay * 0.1), 10.0, 98.0))

                # Historical incident count in past 30 days
                hist_incidents = int(np.random.poisson(lam=1.0 + 3.0 * vuln))

                # Ground Truth Incident Label Injection (Flooding / Major Infrastructure Failure)
                # Incident occurs if severe rainfall + high complaint surge + elevated vulnerability occur
                incident_risk_factor = (rainfall / 50.0) * 0.4 + (total_complaints / 30.0) * 0.4 + vuln * 0.2
                
                # Ground truth incident trigger (Binary: 1 = Incident Occurred, 0 = Normal)
                # Ensure incidents happen during storm periods and isolated severe spikes
                incident_occurred = 1 if (incident_risk_factor > 0.72 and np.random.rand() < 0.85) else 0

                records.append({
                    "date": date_curr.strftime("%Y-%m-%d"),
                    "zone_id": zone_id,
                    "zone_name": z["name"],
                    "latitude": z["centroid"][0],
                    "longitude": z["centroid"][1],
                    "zone_type": z["type"],
                    "base_vulnerability": vuln,
                    "infra_age_years": infra_age,
                    "rainfall_mm": round(rainfall, 2),
                    "temperature_c": round(temperature, 1),
                    "total_complaints": total_complaints,
                    "drainage_clogs": drainage_clogs,
                    "potholes": potholes,
                    "waste_accum": waste_accum,
                    "water_leaks": water_leaks,
                    "sewer_backups": sewer_backups,
                    "power_flickers": power_flickers,
                    "resolution_delay_hrs": resolution_delay,
                    "infra_stress_score": round(infra_stress, 2),
                    "hist_incidents_30d": hist_incidents,
                    "incident_occurred": incident_occurred,
                    "is_synthetic": True,
                })

        df = pd.DataFrame(records)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values(by=["date", "zone_id"]).reset_index(drop=True)
        return df

    def save_to_sqlite_and_csv(self, df: pd.DataFrame, geojson_data: dict):
        """
        Saves generated dataset to SQLite database and CSV.
        """
        csv_path = PROCESSED_DATA_DIR / "raw_urban_signals.csv"
        df.to_csv(csv_path, index=False)
        print(f"Saved raw dataset to CSV: {csv_path}")

        # Save to SQLite
        conn = sqlite3.connect(DB_PATH)
        df_sql = df.copy()
        df_sql["date"] = df_sql["date"].dt.strftime("%Y-%m-%d")
        df_sql.to_sql("urban_signals", conn, if_exists="replace", index=False)

        # Save Zone Geometries Table
        zone_rows = []
        for zone_id, g in geojson_data.items():
            zone_rows.append({
                "zone_id": zone_id,
                "name": g["properties"]["name"],
                "type": g["properties"]["type"],
                "area_km2": g["properties"]["area_km2"],
                "vulnerability": g["properties"]["vulnerability"],
                "infra_age": g["properties"]["infra_age"],
                "geojson_str": json.dumps(g),
            })
        df_zones = pd.DataFrame(zone_rows)
        df_zones.to_sql("urban_zones", conn, if_exists="replace", index=False)

        conn.close()
        print(f"Saved dataset and zones to SQLite DB at: {DB_PATH}")


if __name__ == "__main__":
    gen = SyntheticDataGenerator()
    df = gen.generate_dataset()
    geojson_data = gen.generate_zone_polygons()
    gen.save_to_sqlite_and_csv(df, geojson_data)
    print(f"Generation Complete! Total rows: {len(df)}")
