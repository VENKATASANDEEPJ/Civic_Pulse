import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Any
from src.config import DB_PATH, PROCESSED_DATA_DIR, MODEL_DIR, RISK_LEVEL_THRESHOLDS
from src.data.loader import DataLoader
from src.data.generator import SyntheticDataGenerator
from src.features.pipeline import FeatureEngineeringPipeline
from src.anomaly.detector import AnomalyDetectionEngine
from src.models.trainer import ModelTrainer
from src.evaluation.early_warning import EarlyWarningEvaluator
from src.explainability.explainer import ModelExplainer
from src.decision.engine import DecisionRecommendationEngine
from src.simulation.simulator import CounterfactualSimulator


class CivicPulseService:
    """
    Central API Service orchestrating data loading, feature engineering, model predictions,
    anomaly detection, explainability, decision recommendations, persistent alerts,
    and scenario simulation.
    """

    def __init__(self):
        self.loader = DataLoader()
        self.pipeline = FeatureEngineeringPipeline()
        self.anomaly_engine = AnomalyDetectionEngine()
        self.evaluator = EarlyWarningEvaluator()

        # Load raw data and zones
        self._ensure_dataset_exists()
        self._load_and_compute_all()

    def _ensure_dataset_exists(self):
        csv_path = PROCESSED_DATA_DIR / "raw_urban_signals.csv"
        if not DB_PATH.exists() or not csv_path.exists():
            print("Dataset not found. Running synthetic generator...")
            gen = SyntheticDataGenerator()
            df = gen.generate_dataset()
            geojson = gen.generate_zone_polygons()
            gen.save_to_sqlite_and_csv(df, geojson)

    def _init_model(self):
        model_path = MODEL_DIR / "best_model.joblib"
        if not model_path.exists():
            print("Model checkpoint missing. Running model training pipeline...")
            trainer = ModelTrainer()
            eval_metrics, df_trans = trainer.train_and_evaluate(self.df_raw)
            artifact = trainer.load_model()
        else:
            artifact = ModelTrainer.load_model()
            trainer = ModelTrainer()
            eval_metrics, _ = trainer.train_and_evaluate(self.df_raw)

        return artifact, eval_metrics

    def _load_and_compute_all(self):
        """
        Loads raw data from SQLite, transforms features, detects anomalies,
        loads/trains ML model, pre-computes zone risk caches, and syncs alerts.
        """
        self.df_raw = self.loader.load_raw_signals()
        self.zones = self.loader.load_zones()

        # Transform features
        self.df_features = self.pipeline.fit_transform(self.df_raw)

        # Detect anomalies
        self.df_features, self.anomaly_metrics = self.anomaly_engine.fit_detect(self.df_features)

        # Train / Load Machine Learning Model
        self.model_artifact, self.eval_metrics = self._init_model()
        self.explainer = ModelExplainer(self.model_artifact["model"], self.model_artifact["feature_names"])
        self.simulator = CounterfactualSimulator(self.model_artifact)

        # Precompute & Cache Latest Zone Risks and Explanations
        self._compute_latest_zone_risks()

        # Sync alerts to persistent SQLite table
        self.loader.sync_alerts_from_zones(list(self.zone_cache.values()))

    def _compute_latest_zone_risks(self):
        """
        Computes risk score (0-100) and pre-caches XAI explanations for all zones on latest available day.
        """
        latest_date = self.df_features["date"].max()
        df_latest = self.df_features[self.df_features["date"] == latest_date].copy().reset_index(drop=True)

        X_latest = df_latest[self.model_artifact["feature_names"]]
        probs = self.model_artifact["model"].predict_proba(X_latest)[:, 1]
        df_latest["risk_score"] = np.round(probs * 100.0, 1)

        self.latest_date_str = latest_date.strftime("%Y-%m-%d")
        self.latest_zone_risks = df_latest

        # Early Warning Evaluation stats
        df_all_pred = self.df_features.copy()
        X_all = df_all_pred[self.model_artifact["feature_names"]]
        df_all_pred["risk_score"] = np.round(self.model_artifact["model"].predict_proba(X_all)[:, 1] * 100.0, 1)
        self.early_warning_stats = self.evaluator.evaluate_lead_times(df_all_pred)

        # Precompute zone explanations and recommendations for high-speed API retrieval
        self.zone_cache = {}
        for _, row in df_latest.iterrows():
            zid = row["zone_id"]
            z_meta = next((z for z in self.zones if z["zone_id"] == zid), {})
            df_row = df_latest[df_latest["zone_id"] == zid][self.model_artifact["feature_names"]]
            explanation = self.explainer.explain_prediction(df_row, float(row["risk_score"]))

            top_driver = explanation["top_positive_contributors"][0]["feature_name_human"] if explanation["top_positive_contributors"] else "Baseline Recurrence"
            rec = DecisionRecommendationEngine.generate_recommendation(float(row["risk_score"]), top_driver, row["zone_name"])

            self.zone_cache[zid] = {
                "zone_id": zid,
                "name": row["zone_name"],
                "type": row["zone_type"],
                "area_km2": float(row["area_km2"]),
                "risk_score": float(row["risk_score"]),
                "risk_level": explanation["risk_level"],
                "rainfall_mm": float(row["rainfall_mm"]),
                "total_complaints": int(row["total_complaints"]),
                "infra_stress_score": float(row["infra_stress_score"]),
                "top_driver": top_driver,
                "explanation": explanation,
                "recommendation": rec,
                "geojson": z_meta.get("geojson", {}),
            }

    def get_overview(
        self,
        zone_id: Optional[str] = None,
        risk_level: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict:
        """
        Calculates city-wide overview statistics with dynamic filtering.
        """
        zones_summary = list(self.zone_cache.values())

        if zone_id and zone_id != "ALL":
            zones_summary = [z for z in zones_summary if z["zone_id"] == zone_id]

        if risk_level and risk_level != "ALL":
            zones_summary = [z for z in zones_summary if z["risk_level"] == risk_level.upper()]

        # Filtered averages
        if zones_summary:
            avg_risk = float(np.mean([z["risk_score"] for z in zones_summary]))
            crit_count = sum(1 for z in zones_summary if z["risk_score"] >= 80.0)
            high_count = sum(1 for z in zones_summary if 60.0 <= z["risk_score"] < 80.0)
            watch_count = sum(1 for z in zones_summary if 30.0 <= z["risk_score"] < 60.0)
            low_count = sum(1 for z in zones_summary if z["risk_score"] < 30.0)
        else:
            avg_risk, crit_count, high_count, watch_count, low_count = 0.0, 0, 0, 0, 0

        # Total active anomalies
        anomaly_count = int(self.latest_zone_risks["iso_anomaly_flag"].sum())

        # Metadata
        meta = self.loader.get_metadata()

        return {
            "city_name": "Metropolitan Pulse Demonstration Area",
            "total_zones": len(zones_summary),
            "monitored_zones_count": len(self.zone_cache),
            "average_risk_score": round(avg_risk, 1),
            "critical_zones_count": crit_count,
            "high_risk_zones_count": high_count,
            "watch_zones_count": watch_count,
            "low_risk_zones_count": low_count,
            "active_anomalies_count": anomaly_count,
            "early_warning_lead_time_hours": self.early_warning_stats["average_lead_time_hours"],
            "detection_rate_percent": self.early_warning_stats["detection_rate_percent"],
            "dataset_date_range": f"{self.df_raw['date'].min().strftime('%Y-%m-%d')} to {self.latest_date_str}",
            "data_mode": meta.get("mode", "Demonstration Mode"),
            "data_source_description": meta.get("source_description", "Reproducible Synthetic Seed 42"),
            "is_synthetic": bool(meta.get("is_synthetic", 1)),
            "last_processed_at": meta.get("last_processed_at", datetime.utcnow().isoformat() + "Z"),
            "zones_summary": sorted(zones_summary, key=lambda x: x["risk_score"], reverse=True),
        }

    def get_zone_detail(self, zone_id: str) -> Dict:
        """
        Retrieves detailed historical time-series signals and XAI explanations for a single zone.
        """
        if zone_id not in self.zone_cache:
            raise KeyError(f"Zone {zone_id} not found.")

        cached_z = self.zone_cache[zone_id]
        df_z = self.df_features[self.df_features["zone_id"] == zone_id].sort_values("date").reset_index(drop=True)

        X_z = df_z[self.model_artifact["feature_names"]]
        probs_z = self.model_artifact["model"].predict_proba(X_z)[:, 1]
        df_z["risk_score"] = np.round(probs_z * 100.0, 1)

        # Timeline array
        timeline = []
        for _, r in df_z.iterrows():
            timeline.append({
                "date": r["date"].strftime("%Y-%m-%d"),
                "risk_score": float(r["risk_score"]),
                "rainfall_mm": float(r["rainfall_mm"]),
                "total_complaints": int(r["total_complaints"]),
                "drainage_clogs": int(r["drainage_clogs"]),
                "infra_stress_score": float(r["infra_stress_score"]),
                "iso_anomaly_flag": int(r["iso_anomaly_flag"]),
                "incident_occurred": int(r["incident_occurred"]),
            })

        return {
            **cached_z,
            "current_risk_score": cached_z["risk_score"],
            "current_risk_level": cached_z["risk_level"],
            "vulnerability": float(self.latest_zone_risks[self.latest_zone_risks["zone_id"] == zone_id]["base_vulnerability"].iloc[0]),
            "infra_age": int(self.latest_zone_risks[self.latest_zone_risks["zone_id"] == zone_id]["infra_age_years"].iloc[0]),
            "timeline": timeline,
        }

    def get_early_warnings(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        zone_id: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict:
        """
        Retrieves persisted alerts from SQLite with optional filters and lead-time metrics.
        """
        alerts = self.loader.get_alerts(status=status, severity=severity, zone_id=zone_id, search=search)
        for a in alerts:
            a["estimated_lead_time_hours"] = self.early_warning_stats["average_lead_time_hours"]

        return {
            "early_warning_metrics": self.early_warning_stats,
            "active_warnings": alerts,
        }

    def acknowledge_alert(self, alert_id: str, notes: Optional[str] = None) -> Dict:
        return self.loader.acknowledge_alert(alert_id, notes=notes)

    def resolve_alert(self, alert_id: str, notes: Optional[str] = None) -> Dict:
        return self.loader.resolve_alert(alert_id, notes=notes)

    def simulate_scenario(self, req: Dict) -> Dict:
        """
        Executes counterfactual What-If simulation for a zone, logs result in SQLite scenario_history.
        """
        zone_id = req["zone_id"]
        df_z = self.latest_zone_risks[self.latest_zone_risks["zone_id"] == zone_id]
        if df_z.empty:
            raise KeyError(f"Zone {zone_id} not found.")

        base_rec = df_z.iloc[0].to_dict()
        res = self.simulator.simulate_intervention(
            base_record=base_rec,
            complaint_reduction_pct=req.get("complaint_reduction_pct", 0.0),
            resolution_speedup_pct=req.get("resolution_speedup_pct", 0.0),
            infra_investment_delta=req.get("infra_investment_delta", 0.0),
            drainage_inspection_active=req.get("drainage_inspection_active", False),
        )
        res["zone_id"] = zone_id
        res["zone_name"] = base_rec["zone_name"]

        # Persist to scenario history
        history_id = self.loader.log_scenario(res)
        res["history_id"] = history_id
        return res

    def get_scenario_history(self, limit: int = 15) -> List[Dict]:
        return self.loader.get_scenario_history(limit=limit)

    def generate_report(self, zone_id: str, assessment_period: Optional[str] = None) -> Dict:
        """
        Generates comprehensive operational assessment report payload for print and municipal review.
        """
        detail = self.get_zone_detail(zone_id)
        meta = self.loader.get_metadata()
        alerts = self.loader.get_alerts(zone_id=zone_id)

        # Calculate recent statistics (last 30 days of zone timeline)
        recent_timeline = detail["timeline"][-30:] if len(detail["timeline"]) >= 30 else detail["timeline"]
        avg_rain = float(np.mean([p["rainfall_mm"] for p in recent_timeline]))
        max_rain = float(np.max([p["rainfall_mm"] for p in recent_timeline]))
        avg_complaints = float(np.mean([p["total_complaints"] for p in recent_timeline]))
        total_incidents = sum(p["incident_occurred"] for p in recent_timeline)
        total_anomalies = sum(p["iso_anomaly_flag"] for p in recent_timeline)

        return {
            "report_title": f"MUNICIPAL URBAN INFRASTRUCTURE RISK ASSESSMENT REPORT — {detail['name'].upper()}",
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "dataset_identifier": meta.get("source_description", "Metropolitan Pulse Synthetic Signal Benchmark"),
            "is_synthetic": bool(meta.get("is_synthetic", 1)),
            "assessment_period": assessment_period or f"Last 30 Days (Horizon to {self.latest_date_str})",
            "zone_info": {
                "zone_id": detail["zone_id"],
                "name": detail["name"],
                "type": detail["type"],
                "area_km2": detail["area_km2"],
                "vulnerability": detail["vulnerability"],
                "infra_age_years": detail["infra_age"],
            },
            "risk_assessment": {
                "estimated_risk_score": detail["current_risk_score"],
                "risk_classification": detail["current_risk_level"],
                "top_driver": detail["top_driver"],
                "primary_evidence": detail["explanation"]["human_explanation"],
                "shap_contributors": detail["explanation"]["top_positive_contributors"],
            },
            "observed_indicators_30d": {
                "average_rainfall_mm": round(avg_rain, 1),
                "peak_rainfall_mm": round(max_rain, 1),
                "average_daily_complaints": round(avg_complaints, 1),
                "anomalies_detected": total_anomalies,
                "recorded_incidents": total_incidents,
            },
            "active_alerts": alerts,
            "recommended_actions": detail["recommendation"],
            "methodology_summary": (
                "Composite Risk Modeling utilizing calibrated HistGradientBoostingClassifier with out-of-time temporal validation, "
                "coupled with SHAP Explainable AI attribution and dual Isolation Forest anomaly detection."
            ),
            "disclaimer_and_limitations": (
                "This assessment is provided as an operational decision-support tool to prioritize municipal maintenance inspections. "
                "It does not replace official emergency command decisions or onsite engineering verifications. Demonstration mode: synthetic baseline."
            ),
        }

    def reset_demonstration_data(self) -> Dict:
        """
        Regenerates reproducible demonstration dataset with seed 42,
        resets SQLite tables and recomputes all analytics.
        """
        print("Resetting to demonstration dataset (Seed 42)...")
        gen = SyntheticDataGenerator(seed=42)
        df = gen.generate_dataset()
        geojson = gen.generate_zone_polygons()
        gen.save_to_sqlite_and_csv(df, geojson)

        # Reset metadata
        self.loader.update_metadata(
            mode="Demonstration Mode",
            description="Reproducible Synthetic Seed 42 with Storm Dynamics",
            is_synthetic=True,
            total_rows=len(df),
            d_min=df["date"].min().strftime("%Y-%m-%d"),
            d_max=df["date"].max().strftime("%Y-%m-%d")
        )

        # Clear alerts and re-compute
        conn = self.loader.get_connection()
        conn.execute("DELETE FROM alerts")
        conn.commit()
        conn.close()

        self._load_and_compute_all()

        return {
            "status": "SUCCESS",
            "message": "Dataset successfully reset to reproducible demonstration baseline (Seed 42).",
            "total_rows": len(df),
            "date_range": f"{df['date'].min().strftime('%Y-%m-%d')} to {self.latest_date_str}",
        }

    def import_csv_dataset(self, df_imported: pd.DataFrame) -> Dict:
        """
        Safely validates and imports custom CSV records into SQLite.
        Recalculates features, anomaly detectors, and zone risks.
        """
        valid, issues = self.loader.validate_dataset(df_imported)
        if not valid:
            raise ValueError(f"Dataset validation failed: {'; '.join(issues)}")

        # Save to SQLite urban_signals table
        conn = self.loader.get_connection()
        df_sql = df_imported.copy()
        df_sql["date"] = pd.to_datetime(df_sql["date"]).dt.strftime("%Y-%m-%d")
        df_sql.to_sql("urban_signals", conn, if_exists="replace", index=False)
        conn.close()

        # Update metadata
        self.loader.update_metadata(
            mode="Custom Dataset Import",
            description=f"User Imported CSV ({len(df_imported)} records across {df_imported['zone_id'].nunique()} zones)",
            is_synthetic=False,
            total_rows=len(df_imported),
            d_min=df_sql["date"].min(),
            d_max=df_sql["date"].max()
        )

        # Reload analytics
        self._load_and_compute_all()

        return {
            "status": "SUCCESS",
            "message": f"Successfully imported {len(df_imported)} records. Analytics and risk models recomputed.",
            "total_rows": len(df_imported),
            "zones_count": df_imported["zone_id"].nunique(),
            "date_min": df_sql["date"].min(),
            "date_max": df_sql["date"].max(),
        }
