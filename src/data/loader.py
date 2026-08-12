import json
import sqlite3
import pandas as pd
from typing import Dict, List, Optional, Tuple
from src.config import DB_PATH, PROCESSED_DATA_DIR


class DataLoader:
    """
    Data management & database query service for CIVIC-PULSE.
    Handles data validation, fetching time-series records, and zone metadata.
    """

    def __init__(self, db_path: str = str(DB_PATH)):
        self.db_path = db_path

    def get_connection(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def load_raw_signals(self) -> pd.DataFrame:
        """
        Loads all raw urban signal time-series from SQLite or fallback CSV.
        """
        try:
            conn = self.get_connection()
            df = pd.read_sql_query("SELECT * FROM urban_signals", conn)
            conn.close()
            df["date"] = pd.to_datetime(df["date"])
            return df
        except Exception as e:
            csv_path = PROCESSED_DATA_DIR / "raw_urban_signals.csv"
            if csv_path.exists():
                df = pd.read_csv(csv_path)
                df["date"] = pd.to_datetime(df["date"])
                return df
            else:
                raise FileNotFoundError(f"Database table missing and CSV file not found at {csv_path}. Error: {e}")

    def load_zones(self) -> List[Dict]:
        """
        Retrieves all urban zone metadata including GeoJSON definitions.
        """
        conn = self.get_connection()
        df = pd.read_sql_query("SELECT * FROM urban_zones", conn)
        conn.close()
        
        zones = []
        for _, row in df.iterrows():
            g_dict = json.loads(row["geojson_str"]) if "geojson_str" in row and row["geojson_str"] else {}
            zones.append({
                "zone_id": row["zone_id"],
                "name": row["name"],
                "type": row["type"],
                "area_km2": float(row["area_km2"]),
                "vulnerability": float(row["vulnerability"]),
                "infra_age": int(row["infra_age"]),
                "geojson": g_dict,
            })
        return zones

    def load_latest_signals(self) -> pd.DataFrame:
        """
        Fetches the most recent daily record for each urban zone.
        """
        df = self.load_raw_signals()
        latest_date = df["date"].max()
        return df[df["date"] == latest_date].copy().reset_index(drop=True)

    def validate_dataset(self, df: pd.DataFrame) -> Tuple[bool, List[str]]:
        """
        Validates dataset completeness, missing values, and expected column schema.
        """
        required_cols = [
            "date", "zone_id", "rainfall_mm", "total_complaints",
            "drainage_clogs", "potholes", "infra_stress_score", "incident_occurred"
        ]
        issues = []
        for col in required_cols:
            if col not in df.columns:
                issues.append(f"Missing required column: {col}")
        
        null_counts = df[required_cols].isnull().sum()
        for col, n_null in null_counts.items():
            if n_null > 0:
                issues.append(f"Column '{col}' has {n_null} null values.")

        is_valid = len(issues) == 0
        return is_valid, issues
