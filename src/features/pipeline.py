import numpy as np
import pandas as pd
from typing import List, Tuple
from scipy.spatial.distance import cdist
from src.config import URBAN_ZONES


class FeatureEngineeringPipeline:
    """
    Leakage-safe temporal and geospatial feature engineering pipeline for urban risk prediction.
    Calculates rolling baselines, velocities, rainfall anomalies, spatial lag, and infrastructure stress scores.
    """

    def __init__(self):
        self.feature_names: List[str] = []
        self.zone_coords = {z["zone_id"]: z["centroid"] for z in URBAN_ZONES}
        self.zone_areas = {z["zone_id"]: z["area_km2"] for z in URBAN_ZONES}
        self._build_spatial_adjacency_matrix()

    def _build_spatial_adjacency_matrix(self):
        """
        Builds spatial inverse-distance weight matrix between zone centroids for spatial lag calculations.
        """
        zone_ids = list(self.zone_coords.keys())
        coords = np.array([self.zone_coords[zid] for zid in zone_ids])
        
        # Pairwise distance matrix (approx degrees)
        dist_matrix = cdist(coords, coords, metric="euclidean")
        np.fill_diagonal(dist_matrix, np.inf)
        
        # Inverse distance weights
        inv_dist = 1.0 / (dist_matrix + 1e-5)
        # Normalize rows to sum to 1
        weights = inv_dist / inv_dist.sum(axis=1, keepdims=True)
        
        self.zone_id_list = zone_ids
        self.spatial_weights = pd.DataFrame(weights, index=zone_ids, columns=zone_ids)

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Executes feature transformation pipeline on input dataset sorted by date and zone.
        """
        df_out = df.copy()
        df_out["date"] = pd.to_datetime(df_out["date"])
        df_out = df_out.sort_values(by=["zone_id", "date"]).reset_index(drop=True)

        # 1. Complaint Density (complaints per km2)
        df_out["area_km2"] = df_out["zone_id"].map(self.zone_areas).fillna(5.0)
        df_out["complaint_density"] = df_out["total_complaints"] / df_out["area_km2"]

        # Group by zone for temporal rolling computations (prevent temporal leakage)
        grouped = df_out.groupby("zone_id")

        # 2. Rolling Baselines & Velocity
        df_out["complaint_7d_avg"] = grouped["total_complaints"].transform(
            lambda x: x.shift(1).rolling(window=7, min_periods=1).mean()
        )
        df_out["complaint_30d_avg"] = grouped["total_complaints"].transform(
            lambda x: x.shift(1).rolling(window=30, min_periods=1).mean()
        )

        # Velocity: ratio of 7d avg to 30d baseline (or percentage change)
        df_out["complaint_velocity"] = np.where(
            df_out["complaint_30d_avg"] > 0,
            (df_out["total_complaints"] - df_out["complaint_30d_avg"]) / (df_out["complaint_30d_avg"] + 1e-3),
            0.0
        )

        # Complaint Acceleration: change in velocity over 3 days
        df_out["complaint_acceleration"] = grouped["complaint_velocity"].transform(
            lambda x: x.diff(3).fillna(0.0)
        )

        # Deviation from baseline (absolute difference)
        df_out["complaint_baseline_dev"] = df_out["total_complaints"] - df_out["complaint_30d_avg"]

        # 3. Weather Anomalies & Accumulated Rainfall
        df_out["rainfall_3d_sum"] = grouped["rainfall_mm"].transform(
            lambda x: x.rolling(window=3, min_periods=1).sum()
        )
        df_out["rainfall_30d_mean"] = grouped["rainfall_mm"].transform(
            lambda x: x.shift(1).rolling(window=30, min_periods=1).mean()
        )
        df_out["rainfall_30d_std"] = grouped["rainfall_mm"].transform(
            lambda x: x.shift(1).rolling(window=30, min_periods=1).std()
        ).fillna(1.0)

        # Rainfall Z-Score (Anomaly index)
        df_out["rainfall_anomaly_zscore"] = np.where(
            df_out["rainfall_30d_std"] > 1e-3,
            (df_out["rainfall_mm"] - df_out["rainfall_30d_mean"]) / (df_out["rainfall_30d_std"] + 1e-3),
            0.0
        )

        # 4. Seasonal Harmonics
        day_of_year = df_out["date"].dt.dayofyear
        df_out["sin_day_of_year"] = np.sin(2 * np.pi * day_of_year / 365.25)
        df_out["cos_day_of_year"] = np.cos(2 * np.pi * day_of_year / 365.25)

        # 5. Incident Severity Index
        df_out["incident_severity_index"] = (
            df_out["drainage_clogs"] * 1.5 +
            df_out["sewer_backups"] * 2.0 +
            df_out["water_leaks"] * 1.2 +
            df_out["potholes"] * 1.0
        ) / (df_out["total_complaints"] + 1.0)

        # 6. Spatial Neighbor Risk Lag
        # Calculate daily spatial lag score (weighted average of neighboring zones' complaint velocities)
        spatial_lag_scores = []
        for date, date_df in df_out.groupby("date"):
            vel_series = date_df.set_index("zone_id")["complaint_velocity"]
            for zid in date_df["zone_id"]:
                weights = self.spatial_weights.loc[zid]
                # Neighbor weighted score
                neighbor_val = (weights * vel_series).sum()
                spatial_lag_scores.append((date, zid, neighbor_val))

        df_spatial = pd.DataFrame(spatial_lag_scores, columns=["date", "zone_id", "neighbor_risk_lag"])
        df_out = pd.merge(df_out, df_spatial, on=["date", "zone_id"], how="left")

        # Fill any remaining NaNs safely
        feature_cols = [
            "base_vulnerability", "infra_age_years", "rainfall_mm", "rainfall_3d_sum",
            "rainfall_anomaly_zscore", "total_complaints", "complaint_density",
            "complaint_7d_avg", "complaint_30d_avg", "complaint_velocity",
            "complaint_acceleration", "complaint_baseline_dev", "resolution_delay_hrs",
            "infra_stress_score", "hist_incidents_30d", "incident_severity_index",
            "neighbor_risk_lag", "sin_day_of_year", "cos_day_of_year"
        ]
        df_out[feature_cols] = df_out[feature_cols].fillna(0.0)

        self.feature_names = feature_cols
        return df_out

    def get_feature_matrix(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Extracts feature matrix X and target y ('incident_occurred').
        """
        if not self.feature_names:
            df_transformed = self.fit_transform(df)
        else:
            df_transformed = df

        X = df_transformed[self.feature_names]
        y = df_transformed["incident_occurred"] if "incident_occurred" in df_transformed.columns else None
        return X, y
