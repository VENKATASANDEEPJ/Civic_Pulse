import numpy as np
import pandas as pd
from typing import Dict, List
from src.config import RISK_LEVEL_THRESHOLDS


class CounterfactualSimulator:
    """
    Transparent model-based What-if Scenario Simulator.
    Allows municipal managers to simulate urban infrastructure interventions (e.g. drain clearing,
    speeding up maintenance, public waste reduction) and evaluate projected risk reductions.
    """

    def __init__(self, model_artifact: Dict):
        self.calibrated_model = model_artifact["model"]
        self.pipeline = model_artifact["pipeline"]
        self.feature_names = model_artifact["feature_names"]

    def _extract_feature_row(self, record: Dict) -> pd.DataFrame:
        """
        Ensures all expected model feature columns exist in record DataFrame.
        """
        df = pd.DataFrame([record])

        # If full engineered features exist, extract directly
        missing_feats = [f for f in self.feature_names if f not in df.columns]
        
        if missing_feats:
            # Run feature pipeline if raw signals provided
            try:
                df_trans = self.pipeline.fit_transform(df)
            except Exception:
                df_trans = df
            
            # Fill remaining missing feature columns with default baseline 0.0 values
            for feat in missing_feats:
                if feat not in df_trans.columns:
                    df_trans[feat] = 0.0
            return df_trans[self.feature_names]
        else:
            return df[self.feature_names]

    def simulate_intervention(
        self,
        base_record: Dict,
        complaint_reduction_pct: float = 0.0,
        resolution_speedup_pct: float = 0.0,
        infra_investment_delta: float = 0.0,
        drainage_inspection_active: bool = False,
    ) -> Dict:
        """
        Executes model inference on baseline record vs modified counterfactual record.
        """
        # 1. Calculate Baseline Risk Score via model
        X_base = self._extract_feature_row(base_record)
        base_prob = float(self.calibrated_model.predict_proba(X_base)[:, 1][0])
        base_score = round(base_prob * 100.0, 1)

        # 2. Construct Counterfactual Record with modified intervention levers
        sim_record = base_record.copy()

        if complaint_reduction_pct > 0:
            c_factor = 1.0 - (complaint_reduction_pct / 100.0)
            if "total_complaints" in sim_record:
                sim_record["total_complaints"] = max(0, int(sim_record["total_complaints"] * c_factor))
            if "complaint_velocity" in sim_record:
                sim_record["complaint_velocity"] = max(-0.8, float(sim_record["complaint_velocity"] * c_factor))

        if resolution_speedup_pct > 0:
            r_factor = 1.0 - (resolution_speedup_pct / 100.0)
            if "resolution_delay_hrs" in sim_record:
                sim_record["resolution_delay_hrs"] = max(2.0, float(sim_record["resolution_delay_hrs"] * r_factor))

        if infra_investment_delta > 0:
            if "infra_stress_score" in sim_record:
                current_stress = sim_record["infra_stress_score"]
                sim_record["infra_stress_score"] = max(10.0, float(current_stress - infra_investment_delta))

        if drainage_inspection_active:
            if "drainage_clogs" in sim_record:
                sim_record["drainage_clogs"] = max(0, int(sim_record["drainage_clogs"] * 0.4))
            if "infra_stress_score" in sim_record:
                sim_record["infra_stress_score"] = max(10.0, float(sim_record["infra_stress_score"] * 0.8))
            if "complaint_velocity" in sim_record:
                sim_record["complaint_velocity"] = max(-0.8, float(sim_record["complaint_velocity"] * 0.5))

        # Re-run feature extraction on simulated record
        X_sim = self._extract_feature_row(sim_record)
        sim_prob = float(self.calibrated_model.predict_proba(X_sim)[:, 1][0])
        sim_score = round(sim_prob * 100.0, 1)

        delta = round(sim_score - base_score, 1)
        risk_reduced = delta < 0

        return {
            "simulation_label": "Scenario Simulation / Model-based What-if Analysis",
            "baseline_risk_score": base_score,
            "baseline_risk_level": self._get_risk_level(base_score),
            "simulated_risk_score": sim_score,
            "simulated_risk_level": self._get_risk_level(sim_score),
            "risk_score_delta": delta,
            "is_risk_reduced": risk_reduced,
            "percentage_risk_change": f"{round((delta / (base_score + 1e-3)) * 100, 1)}%",
            "levers_applied": {
                "complaint_reduction_pct": complaint_reduction_pct,
                "resolution_speedup_pct": resolution_speedup_pct,
                "infra_investment_delta": infra_investment_delta,
                "drainage_inspection_active": drainage_inspection_active,
            },
            "assumptions": (
                "Interventions alter input signal state (complaint velocity, maintenance resolution delay, infrastructure stress). "
                "The calibrated risk classifier predicts updated probability under altered state."
            ),
        }

    def _get_risk_level(self, score: float) -> str:
        if score >= 80:
            return "CRITICAL"
        elif score >= 60:
            return "HIGH"
        elif score >= 30:
            return "WATCH"
        else:
            return "LOW"
