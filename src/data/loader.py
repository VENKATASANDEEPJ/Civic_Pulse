import json
import sqlite3
from datetime import datetime
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from src.config import DB_PATH, PROCESSED_DATA_DIR


class DataLoader:
    """
    Data management & database persistence service for CIVIC-PULSE.
    Handles data validation, fetching time-series records, zone metadata,
    persistent alerts, scenario history, and CSV uploads.
    """

    def __init__(self, db_path: str = str(DB_PATH)):
        self.db_path = db_path
        self.init_database_tables()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_database_tables(self):
        """
        Creates required SQLite tables if they do not exist:
        - alerts: Persistent early warning management
        - scenario_history: Persistent What-If scenario simulations
        - dataset_metadata: Data mode and provenance tracking
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        # Alerts Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                alert_id TEXT PRIMARY KEY,
                zone_id TEXT NOT NULL,
                zone_name TEXT NOT NULL,
                severity TEXT NOT NULL,
                risk_score REAL NOT NULL,
                top_driver TEXT NOT NULL,
                explanation_summary TEXT,
                action_title TEXT,
                sla TEXT,
                recommended_steps TEXT,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                created_at TEXT NOT NULL,
                acknowledged_at TEXT,
                resolved_at TEXT,
                notes TEXT
            )
        """)

        # Scenario History Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scenario_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                zone_id TEXT NOT NULL,
                zone_name TEXT NOT NULL,
                complaint_reduction_pct REAL,
                resolution_speedup_pct REAL,
                infra_investment_delta REAL,
                drainage_inspection_active INTEGER,
                baseline_risk_score REAL,
                simulated_risk_score REAL,
                risk_delta REAL,
                baseline_risk_level TEXT,
                simulated_risk_level TEXT,
                assumptions TEXT
            )
        """)

        # Dataset Metadata Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dataset_metadata (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                mode TEXT NOT NULL,
                source_description TEXT NOT NULL,
                is_synthetic INTEGER NOT NULL,
                last_processed_at TEXT NOT NULL,
                total_records INTEGER,
                date_min TEXT,
                date_max TEXT
            )
        """)

        # Ensure default metadata exists
        cursor.execute("SELECT COUNT(*) as cnt FROM dataset_metadata")
        if cursor.fetchone()["cnt"] == 0:
            cursor.execute("""
                INSERT INTO dataset_metadata (id, mode, source_description, is_synthetic, last_processed_at, total_records, date_min, date_max)
                VALUES (1, 'Demonstration Mode', 'Reproducible Synthetic Seed 42 with Storm Dynamics', 1, ?, 2160, '2026-01-01', '2026-06-29')
            """, (datetime.utcnow().isoformat() + "Z",))

        conn.commit()
        conn.close()

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
                issues.append(f"Missing required column: '{col}'")

        if len(issues) == 0:
            null_counts = df[required_cols].isnull().sum()
            for col, n_null in null_counts.items():
                if n_null > 0:
                    issues.append(f"Column '{col}' has {n_null} null values.")

            # Validate date format
            try:
                pd.to_datetime(df["date"])
            except Exception:
                issues.append("Column 'date' contains unparseable date values.")

            # Check negative numbers in complaints or rainfall
            if (df["rainfall_mm"] < 0).any():
                issues.append("Column 'rainfall_mm' contains negative values.")
            if (df["total_complaints"] < 0).any():
                issues.append("Column 'total_complaints' contains negative values.")

        is_valid = len(issues) == 0
        return is_valid, issues

    # ==========================================
    # ALERT PERSISTENCE METHODS
    # ==========================================

    def sync_alerts_from_zones(self, zones_summary: List[Dict]):
        """
        Synchronizes high and critical alerts into the SQLite alerts table.
        Preserves existing ACKNOWLEDGED and RESOLVED states.
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        for z in zones_summary:
            if z["risk_score"] >= 30.0 or z.get("risk_level") in ["CRITICAL", "HIGH", "WATCH"]:
                alert_id = f"ALT-{z['zone_id']}"
                # Check if exists
                cursor.execute("SELECT status FROM alerts WHERE alert_id = ?", (alert_id,))
                row = cursor.fetchone()

                if row is None:
                    # Insert new active alert
                    cursor.execute("""
                        INSERT INTO alerts (
                            alert_id, zone_id, zone_name, severity, risk_score,
                            top_driver, explanation_summary, action_title, sla,
                            recommended_steps, status, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                    """, (
                        alert_id,
                        z["zone_id"],
                        z["name"],
                        z["risk_level"],
                        float(z["risk_score"]),
                        z["top_driver"],
                        z.get("explanation", {}).get("human_explanation", ""),
                        z.get("recommendation", {}).get("action_title", ""),
                        z.get("recommendation", {}).get("sla", ""),
                        json.dumps(z.get("recommendation", {}).get("recommended_steps", [])),
                        datetime.utcnow().isoformat() + "Z"
                    ))
                else:
                    # Update risk_score and top_driver but preserve user status (e.g. ACKNOWLEDGED or RESOLVED)
                    cursor.execute("""
                        UPDATE alerts
                        SET risk_score = ?, severity = ?, top_driver = ?
                        WHERE alert_id = ?
                    """, (float(z["risk_score"]), z["risk_level"], z["top_driver"], alert_id))

        conn.commit()
        conn.close()

    def get_alerts(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        zone_id: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict]:
        """
        Retrieves persisted alerts from SQLite with optional filters.
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM alerts WHERE 1=1"
        params = []

        if status and status.upper() != "ALL":
            query += " AND status = ?"
            params.append(status.upper())

        if severity and severity.upper() != "ALL":
            query += " AND severity = ?"
            params.append(severity.upper())

        if zone_id and zone_id.upper() != "ALL":
            query += " AND zone_id = ?"
            params.append(zone_id)

        if search:
            query += " AND (zone_name LIKE ? OR top_driver LIKE ? OR alert_id LIKE ?)"
            s_param = f"%{search}%"
            params.extend([s_param, s_param, s_param])

        query += " ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, risk_score DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        alerts = []
        for r in rows:
            steps = []
            if r["recommended_steps"]:
                try:
                    steps = json.loads(r["recommended_steps"])
                except Exception:
                    steps = [r["recommended_steps"]]

            alerts.append({
                "alert_id": r["alert_id"],
                "zone_id": r["zone_id"],
                "name": r["zone_name"],
                "severity": r["severity"],
                "risk_level": r["severity"],
                "risk_score": float(r["risk_score"]),
                "top_driver": r["top_driver"],
                "explanation_summary": r["explanation_summary"],
                "action_title": r["action_title"],
                "sla": r["sla"],
                "recommended_steps": steps,
                "status": r["status"],
                "created_at": r["created_at"],
                "acknowledged_at": r["acknowledged_at"],
                "resolved_at": r["resolved_at"],
                "notes": r["notes"],
            })

        conn.close()
        return alerts

    def acknowledge_alert(self, alert_id: str, notes: Optional[str] = None) -> Dict:
        """
        Updates alert status to ACKNOWLEDGED with timestamp and notes.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        now_str = datetime.utcnow().isoformat() + "Z"
        cursor.execute("""
            UPDATE alerts
            SET status = 'ACKNOWLEDGED', acknowledged_at = ?, notes = COALESCE(?, notes)
            WHERE alert_id = ?
        """, (now_str, notes, alert_id))
        conn.commit()

        cursor.execute("SELECT * FROM alerts WHERE alert_id = ?", (alert_id,))
        row = cursor.fetchone()
        conn.close()

        if row is None:
            raise KeyError(f"Alert '{alert_id}' not found.")
        return dict(row)

    def resolve_alert(self, alert_id: str, notes: Optional[str] = None) -> Dict:
        """
        Updates alert status to RESOLVED with timestamp and notes.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        now_str = datetime.utcnow().isoformat() + "Z"
        cursor.execute("""
            UPDATE alerts
            SET status = 'RESOLVED', resolved_at = ?, notes = COALESCE(?, notes)
            WHERE alert_id = ?
        """, (now_str, notes, alert_id))
        conn.commit()

        cursor.execute("SELECT * FROM alerts WHERE alert_id = ?", (alert_id,))
        row = cursor.fetchone()
        conn.close()

        if row is None:
            raise KeyError(f"Alert '{alert_id}' not found.")
        return dict(row)

    # ==========================================
    # SCENARIO SIMULATION PERSISTENCE
    # ==========================================

    def log_scenario(self, scenario_data: Dict) -> int:
        """
        Persists a What-If scenario run into SQLite scenario_history.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO scenario_history (
                timestamp, zone_id, zone_name, complaint_reduction_pct,
                resolution_speedup_pct, infra_investment_delta, drainage_inspection_active,
                baseline_risk_score, simulated_risk_score, risk_delta,
                baseline_risk_level, simulated_risk_level, assumptions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.utcnow().isoformat() + "Z",
            scenario_data.get("zone_id", ""),
            scenario_data.get("zone_name", ""),
            float(scenario_data.get("levers_applied", {}).get("complaint_reduction_pct", 0.0)),
            float(scenario_data.get("levers_applied", {}).get("resolution_speedup_pct", 0.0)),
            float(scenario_data.get("levers_applied", {}).get("infra_investment_delta", 0.0)),
            1 if scenario_data.get("levers_applied", {}).get("drainage_inspection_active", False) else 0,
            float(scenario_data.get("baseline_risk_score", 0.0)),
            float(scenario_data.get("simulated_risk_score", 0.0)),
            float(scenario_data.get("risk_score_delta", 0.0)),
            scenario_data.get("baseline_risk_level", "LOW"),
            scenario_data.get("simulated_risk_level", "LOW"),
            scenario_data.get("assumptions", ""),
        ))
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()
        return last_id

    def get_scenario_history(self, limit: int = 15) -> List[Dict]:
        """
        Retrieves recent scenario simulations.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM scenario_history
            ORDER BY id DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        history = [dict(r) for r in rows]
        conn.close()
        return history

    # ==========================================
    # DATA EXPLORER & RECORDS QUERYING
    # ==========================================

    def get_records(
        self,
        page: int = 1,
        page_size: int = 20,
        zone_id: Optional[str] = None,
        sort_by: str = "date",
        sort_desc: bool = True,
        search: Optional[str] = None,
    ) -> Dict:
        """
        Returns paginated, sorted, and filtered raw urban signals records.
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        allowed_sort_cols = {
            "date", "zone_id", "zone_name", "rainfall_mm", "temperature_c",
            "total_complaints", "drainage_clogs", "potholes", "infra_stress_score",
            "incident_occurred", "resolution_delay_hrs"
        }
        if sort_by not in allowed_sort_cols:
            sort_by = "date"

        direction = "DESC" if sort_desc else "ASC"

        where_clauses = ["1=1"]
        params = []

        if zone_id and zone_id != "ALL":
            where_clauses.append("zone_id = ?")
            params.append(zone_id)

        if search:
            where_clauses.append("(zone_name LIKE ? OR zone_id LIKE ? OR date LIKE ?)")
            s_param = f"%{search}%"
            params.extend([s_param, s_param, s_param])

        where_sql = " AND ".join(where_clauses)

        # Count total
        count_query = f"SELECT COUNT(*) as total FROM urban_signals WHERE {where_sql}"
        cursor.execute(count_query, params)
        total = cursor.fetchone()["total"]

        # Fetch page
        offset = (page - 1) * page_size
        query = f"""
            SELECT * FROM urban_signals
            WHERE {where_sql}
            ORDER BY {sort_by} {direction}
            LIMIT ? OFFSET ?
        """
        cursor.execute(query, params + [page_size, offset])
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()

        total_pages = max(1, (total + page_size - 1) // page_size)

        return {
            "items": rows,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def update_metadata(self, mode: str, description: str, is_synthetic: bool, total_rows: int, d_min: str, d_max: str):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE dataset_metadata
            SET mode = ?, source_description = ?, is_synthetic = ?, last_processed_at = ?, total_records = ?, date_min = ?, date_max = ?
            WHERE id = 1
        """, (mode, description, 1 if is_synthetic else 0, datetime.utcnow().isoformat() + "Z", total_rows, d_min, d_max))
        conn.commit()
        conn.close()

    def get_metadata(self) -> Dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM dataset_metadata WHERE id = 1")
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else {}

