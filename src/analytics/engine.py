"""
CIVIC-PULSE Advanced Analytics Engine
Provides trend analysis, risk forecasting, correlation analysis,
and comparative zone intelligence.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta


class TrendAnalyzer:
    """
    Analyzes temporal trends in urban risk data across multiple time horizons.
    Provides directional trends, rate-of-change metrics, and comparisons.
    """

    @staticmethod
    def compute_zone_trends(
        df: pd.DataFrame,
        zone_id: str,
        horizons: List[int] = [7, 14, 30, 90],
    ) -> Dict[str, Any]:
        """
        Computes multi-horizon trend analysis for a specific zone.
        Returns trend direction, magnitude, rate of change, and descriptive statistics.
        """
        df_zone = df[df["zone_id"] == zone_id].sort_values("date").copy()
        if df_zone.empty:
            return {"zone_id": zone_id, "status": "NO_DATA"}

        latest_date = df_zone["date"].max()
        latest_row = df_zone[df_zone["date"] == latest_date].iloc[0]

        trends = {}
        metrics = ["risk_score", "rainfall_mm", "total_complaints", "infra_stress_score"]
        
        for metric in metrics:
            if metric not in df_zone.columns:
                continue
            metric_trends = {}
            current_val = float(latest_row.get(metric, 0))

            for horizon in horizons:
                cutoff = latest_date - pd.Timedelta(days=horizon)
                df_period = df_zone[df_zone["date"] > cutoff]
                if len(df_period) < 2:
                    continue

                period_mean = float(df_period[metric].mean())
                period_std = float(df_period[metric].std())
                period_min = float(df_period[metric].min())
                period_max = float(df_period[metric].max())
                
                # Calculate start value for the period
                start_val = float(df_period.iloc[0][metric]) if not df_period.empty else current_val
                
                # Percentage change
                pct_change = ((current_val - start_val) / (start_val + 1e-6)) * 100
                
                # Trend direction via linear regression slope
                x = np.arange(len(df_period))
                y = df_period[metric].values.astype(float)
                if len(x) > 1:
                    slope = np.polyfit(x, y, 1)[0]
                    direction = "INCREASING" if slope > 0.5 else ("DECREASING" if slope < -0.5 else "STABLE")
                else:
                    slope = 0.0
                    direction = "STABLE"

                metric_trends[f"{horizon}d"] = {
                    "horizon_days": horizon,
                    "direction": direction,
                    "slope_per_day": round(float(slope), 3),
                    "pct_change": round(pct_change, 1),
                    "period_mean": round(period_mean, 1),
                    "period_std": round(period_std, 2),
                    "period_min": round(period_min, 1),
                    "period_max": round(period_max, 1),
                    "current_value": round(current_val, 1),
                }

            trends[metric] = metric_trends

        return {
            "zone_id": zone_id,
            "latest_date": latest_date.strftime("%Y-%m-%d"),
            "trends": trends,
        }

    @staticmethod
    def compute_city_trends(
        df: pd.DataFrame,
        horizons: List[int] = [7, 30],
    ) -> Dict[str, Any]:
        """
        Computes city-wide aggregate trends across all zones.
        """
        df_agg = df.groupby("date").agg({
            "total_complaints": "sum",
            "rainfall_mm": "mean",
            "infra_stress_score": "mean",
            "incident_occurred": "sum",
        }).reset_index().sort_values("date")

        latest_date = df_agg["date"].max()
        results = {}

        for metric in ["total_complaints", "rainfall_mm", "infra_stress_score", "incident_occurred"]:
            metric_trends = {}
            current = float(df_agg[df_agg["date"] == latest_date][metric].iloc[0]) if not df_agg.empty else 0

            for horizon in horizons:
                cutoff = latest_date - pd.Timedelta(days=horizon)
                period = df_agg[df_agg["date"] > cutoff]
                if len(period) < 2:
                    continue

                avg = float(period[metric].mean())
                start = float(period.iloc[0][metric])
                pct = ((current - start) / (start + 1e-6)) * 100

                x = np.arange(len(period))
                y = period[metric].values.astype(float)
                slope = np.polyfit(x, y, 1)[0] if len(x) > 1 else 0.0
                direction = "INCREASING" if slope > 0.5 else ("DECREASING" if slope < -0.5 else "STABLE")

                metric_trends[f"{horizon}d"] = {
                    "direction": direction,
                    "slope_per_day": round(float(slope), 3),
                    "pct_change": round(pct, 1),
                    "period_mean": round(avg, 1),
                    "current_value": round(current, 1),
                }

            results[metric] = metric_trends

        return {
            "latest_date": latest_date.strftime("%Y-%m-%d") if not df_agg.empty else "",
            "city_trends": results,
        }


class RiskForecaster:
    """
    Generates risk forecasts using exponential smoothing with trend decomposition.
    Provides 7-day ahead predictions with confidence intervals.
    """

    @staticmethod
    def forecast_zone_risk(
        df: pd.DataFrame,
        zone_id: str,
        model_artifact: Dict,
        horizon_days: int = 7,
    ) -> Dict[str, Any]:
        """
        Forecasts zone risk scores for the next N days using
        exponential smoothing on historical risk score trajectory.
        """
        df_zone = df[df["zone_id"] == zone_id].sort_values("date").copy()
        if len(df_zone) < 14:
            return {"zone_id": zone_id, "status": "INSUFFICIENT_DATA"}

        # If risk_score not in df, compute it
        if "risk_score" not in df_zone.columns:
            feature_names = model_artifact.get("feature_names", [])
            available_features = [f for f in feature_names if f in df_zone.columns]
            if available_features and model_artifact.get("model"):
                X = df_zone[available_features]
                probs = model_artifact["model"].predict_proba(X)[:, 1]
                df_zone["risk_score"] = np.round(probs * 100.0, 1)
            else:
                return {"zone_id": zone_id, "status": "MODEL_ERROR"}

        risk_series = df_zone["risk_score"].values.astype(float)
        dates = df_zone["date"].values

        # Double Exponential Smoothing (Holt's method)
        alpha = 0.3  # Level smoothing
        beta = 0.1   # Trend smoothing

        level = risk_series[0]
        trend = np.mean(np.diff(risk_series[:7])) if len(risk_series) > 7 else 0.0

        levels = [level]
        trends = [trend]
        fitted = [level]

        for t in range(1, len(risk_series)):
            new_level = alpha * risk_series[t] + (1 - alpha) * (level + trend)
            new_trend = beta * (new_level - level) + (1 - beta) * trend
            level = new_level
            trend = new_trend
            levels.append(level)
            trends.append(trend)
            fitted.append(level + trend)

        # Residuals for confidence interval estimation
        residuals = risk_series - np.array(fitted)
        residual_std = float(np.std(residuals)) if len(residuals) > 1 else 5.0

        # Generate forecasts
        last_date = pd.Timestamp(dates[-1])
        forecasts = []
        for h in range(1, horizon_days + 1):
            point_forecast = level + trend * h
            # Clip to valid range
            point_forecast = float(np.clip(point_forecast, 0, 100))
            
            # Widening confidence interval
            ci_width = residual_std * np.sqrt(h) * 1.96
            lower = float(np.clip(point_forecast - ci_width, 0, 100))
            upper = float(np.clip(point_forecast + ci_width, 0, 100))

            forecast_date = last_date + pd.Timedelta(days=h)
            forecasts.append({
                "date": forecast_date.strftime("%Y-%m-%d"),
                "predicted_risk_score": round(point_forecast, 1),
                "confidence_lower": round(lower, 1),
                "confidence_upper": round(upper, 1),
                "risk_level": _classify_risk(point_forecast),
            })

        # Recent historical for context (last 14 days)
        recent_history = []
        for i in range(max(0, len(risk_series) - 14), len(risk_series)):
            recent_history.append({
                "date": pd.Timestamp(dates[i]).strftime("%Y-%m-%d"),
                "risk_score": round(float(risk_series[i]), 1),
                "is_actual": True,
            })

        # Determine forecast outlook
        avg_forecast = np.mean([f["predicted_risk_score"] for f in forecasts])
        current_risk = float(risk_series[-1])
        risk_direction = "INCREASING" if avg_forecast > current_risk + 3 else ("DECREASING" if avg_forecast < current_risk - 3 else "STABLE")

        return {
            "zone_id": zone_id,
            "zone_name": df_zone.iloc[-1].get("zone_name", zone_id),
            "status": "OK",
            "current_risk_score": round(current_risk, 1),
            "forecast_horizon_days": horizon_days,
            "forecast_outlook": risk_direction,
            "average_forecast_risk": round(float(avg_forecast), 1),
            "peak_forecast_risk": round(float(max(f["predicted_risk_score"] for f in forecasts)), 1),
            "recent_history": recent_history,
            "forecasts": forecasts,
            "model_info": {
                "method": "Double Exponential Smoothing (Holt)",
                "alpha": alpha,
                "beta": beta,
                "residual_std": round(residual_std, 2),
            },
        }


class CorrelationAnalyzer:
    """
    Analyzes correlations between urban risk factors for pattern discovery.
    """

    @staticmethod
    def compute_risk_correlations(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Computes pairwise Pearson correlations between key risk indicators.
        """
        correlation_cols = [
            "rainfall_mm", "total_complaints", "drainage_clogs", "potholes",
            "infra_stress_score", "resolution_delay_hrs", "incident_occurred",
        ]
        available = [c for c in correlation_cols if c in df.columns]
        
        if len(available) < 2:
            return {"status": "INSUFFICIENT_COLUMNS"}

        corr_matrix = df[available].corr().round(3)
        
        # Extract significant correlations
        significant_pairs = []
        for i, col1 in enumerate(available):
            for j, col2 in enumerate(available):
                if i < j:
                    r = float(corr_matrix.loc[col1, col2])
                    if abs(r) > 0.3:  # Only report meaningful correlations
                        significant_pairs.append({
                            "factor_1": _humanize_column(col1),
                            "factor_2": _humanize_column(col2),
                            "correlation": r,
                            "strength": "STRONG" if abs(r) > 0.7 else ("MODERATE" if abs(r) > 0.5 else "WEAK"),
                            "direction": "POSITIVE" if r > 0 else "NEGATIVE",
                        })

        # Sort by absolute correlation
        significant_pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)

        # Build matrix for frontend visualization
        matrix_data = []
        for col in available:
            row = {"factor": _humanize_column(col)}
            for col2 in available:
                row[_humanize_column(col2)] = float(corr_matrix.loc[col, col2])
            matrix_data.append(row)

        return {
            "status": "OK",
            "factors": [_humanize_column(c) for c in available],
            "correlation_matrix": matrix_data,
            "significant_correlations": significant_pairs[:15],
            "total_significant_pairs": len(significant_pairs),
        }


def _classify_risk(score: float) -> str:
    if score >= 80:
        return "CRITICAL"
    elif score >= 60:
        return "HIGH"
    elif score >= 30:
        return "WATCH"
    return "LOW"


def _humanize_column(col: str) -> str:
    """Converts snake_case column names to human-readable labels."""
    mapping = {
        "rainfall_mm": "Rainfall (mm)",
        "total_complaints": "Total Complaints",
        "drainage_clogs": "Drainage Clogs",
        "potholes": "Potholes",
        "infra_stress_score": "Infrastructure Stress",
        "resolution_delay_hrs": "Resolution Delay (hrs)",
        "incident_occurred": "Incidents",
        "risk_score": "Risk Score",
        "complaint_velocity": "Complaint Velocity",
        "base_vulnerability": "Base Vulnerability",
    }
    return mapping.get(col, col.replace("_", " ").title())
