import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from src.config import DB_PATH, PROCESSED_DATA_DIR, MODEL_DIR
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
    anomaly detection, explainability, decision recommendations, and scenario simulation.
    """

    def __init__(self):
        self.loader = DataLoader()
        self.pipeline = FeatureEngineeringPipeline()
        self.anomaly_engine = AnomalyDetectionEngine()
        self.evaluator = EarlyWarningEvaluator()
        
        # Load raw data and zones
        self._ensure_dataset_exists()
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

    def get_overview(self) -> Dict:
        """
        Calculates city-wide overview statistics from pre-cached zone summaries.
        """
        df_l = self.latest_zone_risks
        avg_risk = float(df_l["risk_score"].mean())
        crit_count = int((df_l["risk_score"] >= 80).sum())
        high_count = int(((df_l["risk_score"] >= 60) & (df_l["risk_score"] < 80)).sum())
        anomaly_count = int(df_l["iso_anomaly_flag"].sum())

        zones_summary = list(self.zone_cache.values())

        return {
            "city_name": "Metropolitan Pulse Area",
            "total_zones": len(zones_summary),
            "average_risk_score": round(avg_risk, 1),
            "critical_zones_count": crit_count,
            "high_risk_zones_count": high_count,
            "active_anomalies_count": anomaly_count,
            "early_warning_lead_time_hours": self.early_warning_stats["average_lead_time_hours"],
            "detection_rate_percent": self.early_warning_stats["detection_rate_percent"],
            "dataset_date_range": f"{self.df_raw['date'].min().strftime('%Y-%m-%d')} to {self.latest_date_str}",
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

    def get_early_warnings(self) -> Dict:
        """
        Retrieves active early warning alerts ordered by severity and estimated lead times.
        """
        active_warnings = []
        for zid, z_data in self.zone_cache.items():
            if z_data["risk_score"] >= 60.0:
                active_warnings.append({
                    "zone_id": zid,
                    "name": z_data["name"],
                    "risk_score": z_data["risk_score"],
                    "risk_level": z_data["risk_level"],
                    "estimated_lead_time_hours": self.early_warning_stats["average_lead_time_hours"],
                    "top_driver": z_data["top_driver"],
                    "explanation_summary": z_data["explanation"]["human_explanation"],
                    "recommendation": z_data["recommendation"],
                })

        return {
            "early_warning_metrics": self.early_warning_stats,
            "active_warnings": sorted(active_warnings, key=lambda x: x["risk_score"], reverse=True),
        }

    def simulate_scenario(self, req: Dict) -> Dict:
        """
        Executes counterfactual What-If simulation for a zone.
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
        return res
