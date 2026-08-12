import numpy as np
import pandas as pd
from typing import Dict, Tuple
from sklearn.ensemble import IsolationForest
from src.config import RANDOM_SEED


class AnomalyDetectionEngine:
    """
    Dual anomaly detection engine comparing Statistical Baseline (Z-Score/IQR) vs
    Multivariate Isolation Forest for detecting unusual complaint spikes & weather surges.
    """

    def __init__(self, contamination: float = 0.08, seed: int = RANDOM_SEED):
        self.contamination = contamination
        self.seed = seed
        self.iso_forest = IsolationForest(
            contamination=self.contamination,
            random_state=self.seed,
            n_estimators=100
        )
        self.feature_cols = [
            "rainfall_mm", "total_complaints", "complaint_velocity",
            "rainfall_anomaly_zscore", "infra_stress_score"
        ]

    def fit_detect(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """
        Fits models and appends statistical and Isolation Forest anomaly flags & scores to DataFrame.
        """
        df_out = df.copy()

        # 1. Statistical Baseline Anomaly Detection (Z-score threshold > 2.5 on complaint velocity & rain anomaly)
        stat_flags = (
            (df_out["complaint_velocity"] > 1.8) |
            (df_out["rainfall_anomaly_zscore"] > 2.2) |
            (df_out["total_complaints"] > (df_out["complaint_30d_avg"] + 2.5 * (df_out["complaint_7d_avg"].std() + 1.0)))
        ).astype(int)
        
        df_out["stat_anomaly_flag"] = stat_flags
        # Z-score composite anomaly magnitude
        df_out["stat_anomaly_score"] = np.clip(
            (np.maximum(0, df_out["complaint_velocity"]) + np.maximum(0, df_out["rainfall_anomaly_zscore"])) / 2.0,
            0.0, 1.0
        )

        # 2. Isolation Forest Anomaly Detection
        X_anomaly = df_out[self.feature_cols].fillna(0.0)
        self.iso_forest.fit(X_anomaly)
        
        # decision_function returns anomaly score (lower means more anomalous)
        raw_scores = self.iso_forest.decision_function(X_anomaly)
        # Normalize score to [0, 1] range where 1 is highest anomaly
        norm_scores = 1.0 - (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-5)
        
        iso_flags = (self.iso_forest.predict(X_anomaly) == -1).astype(int)
        
        df_out["iso_anomaly_flag"] = iso_flags
        df_out["iso_anomaly_score"] = np.round(norm_scores, 3)

        # 3. Method Comparison Evaluation against ground truth incident spikes if available
        comparison_metrics = self._evaluate_methods(df_out)

        return df_out, comparison_metrics

    def _evaluate_methods(self, df: pd.DataFrame) -> Dict:
        """
        Computes precision, recall, F1, and overlap comparison between Statistical Z-score vs Isolation Forest.
        """
        metrics = {}
        y_true = df["incident_occurred"] if "incident_occurred" in df.columns else None

        stat_pred = df["stat_anomaly_flag"]
        iso_pred = df["iso_anomaly_flag"]

        # Overlap
        both = (stat_pred & iso_pred).sum()
        either = (stat_pred | iso_pred).sum()
        jaccard_overlap = float(both / either) if either > 0 else 0.0

        metrics["jaccard_overlap"] = round(jaccard_overlap, 3)
        metrics["stat_total_anomalies"] = int(stat_pred.sum())
        metrics["iso_total_anomalies"] = int(iso_pred.sum())

        if y_true is not None and y_true.sum() > 0:
            for name, pred in [("Statistical Z-Score", stat_pred), ("Isolation Forest", iso_pred)]:
                tp = int(((pred == 1) & (y_true == 1)).sum())
                fp = int(((pred == 1) & (y_true == 0)).sum())
                fn = int(((pred == 0) & (y_true == 1)).sum())
                
                prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
                rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
                f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0.0
                
                metrics[f"{name}_precision"] = round(prec, 3)
                metrics[f"{name}_recall"] = round(rec, 3)
                metrics[f"{name}_f1"] = round(f1, 3)

        metrics["comparison_summary"] = (
            "Statistical Z-score excels at univariate extreme spikes (e.g. sudden flash rain burst), "
            "whereas Isolation Forest detects complex multi-variate signal interactions (e.g. moderate rain coupled with decaying resolution delay and high vulnerability)."
        )
        return metrics
