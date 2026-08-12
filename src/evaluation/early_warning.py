import numpy as np
import pandas as pd
from typing import Dict


class EarlyWarningEvaluator:
    """
    Evaluates early warning performance metrics:
    - Early Warning Lead Time (Average and Median hours/days prior to incident)
    - Early Detection Rate (% of incidents preceded by warning)
    - False Alarm Rate (% of false warnings)
    """

    def __init__(self, risk_threshold: float = 65.0, warning_window_days: int = 5):
        self.risk_threshold = risk_threshold
        self.warning_window_days = warning_window_days

    def evaluate_lead_times(self, df_with_predictions: pd.DataFrame) -> Dict:
        """
        Calculates lead times by analyzing continuous zone timelines for risk score threshold breaches
        prior to ground-truth incident events.
        """
        df_sorted = df_with_predictions.sort_values(by=["zone_id", "date"]).reset_index(drop=True)
        
        lead_times_days = []
        incidents_warned = 0
        total_incidents = 0
        total_warnings_issued = 0
        false_warnings = 0

        for zone_id, zone_df in df_sorted.groupby("zone_id"):
            zone_df = zone_df.reset_index(drop=True)
            n_rows = len(zone_df)
            
            # Find index of incidents
            incident_indices = zone_df[zone_df["incident_occurred"] == 1].index.tolist()
            total_incidents += len(incident_indices)

            # Find index of warning triggers (risk >= threshold)
            warning_indices = zone_df[zone_df["risk_score"] >= self.risk_threshold].index.tolist()
            total_warnings_issued += len(warning_indices)

            for inc_idx in incident_indices:
                inc_date = zone_df.loc[inc_idx, "date"]
                # Look back up to warning_window_days prior
                prior_window = zone_df.loc[max(0, inc_idx - self.warning_window_days): inc_idx - 1]
                
                warnings_in_window = prior_window[prior_window["risk_score"] >= self.risk_threshold]
                
                if not warnings_in_window.empty:
                    incidents_warned += 1
                    # Earliest warning date in window
                    first_warn_date = warnings_in_window.iloc[0]["date"]
                    lead_days = (inc_date - first_warn_date).days
                    lead_times_days.append(max(1, lead_days))

            for warn_idx in warning_indices:
                warn_date = zone_df.loc[warn_idx, "date"]
                # Look forward up to warning_window_days
                future_window = zone_df.loc[warn_idx: min(n_rows - 1, warn_idx + self.warning_window_days)]
                
                incidents_in_window = future_window[future_window["incident_occurred"] == 1]
                if incidents_in_window.empty:
                    false_warnings += 1

        avg_lead_days = float(np.mean(lead_times_days)) if lead_times_days else 0.0
        median_lead_days = float(np.median(lead_times_days)) if lead_times_days else 0.0
        detection_rate = float(incidents_warned / total_incidents) if total_incidents > 0 else 0.0
        false_alarm_rate = float(false_warnings / total_warnings_issued) if total_warnings_issued > 0 else 0.0

        return {
            "risk_threshold": self.risk_threshold,
            "average_lead_time_days": round(avg_lead_days, 2),
            "average_lead_time_hours": round(avg_lead_days * 24.0, 1),
            "median_lead_time_days": round(median_lead_days, 2),
            "median_lead_time_hours": round(median_lead_days * 24.0, 1),
            "detection_rate": round(detection_rate, 3),
            "detection_rate_percent": f"{round(detection_rate * 100, 1)}%",
            "false_alarm_rate": round(false_alarm_rate, 3),
            "false_alarm_rate_percent": f"{round(false_alarm_rate * 100, 1)}%",
            "total_incidents_eval": total_incidents,
            "total_incidents_warned": incidents_warned,
            "total_warnings_triggered": total_warnings_issued,
        }
