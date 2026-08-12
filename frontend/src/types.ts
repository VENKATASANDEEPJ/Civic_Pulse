export interface ZoneRecommendation {
  risk_score: number;
  risk_level: 'LOW' | 'WATCH' | 'HIGH' | 'CRITICAL';
  urgency: string;
  sla: string;
  action_title: string;
  recommended_steps: string[];
  primary_driver_addressed: string;
}

export interface ZoneSummary {
  zone_id: string;
  name: string;
  type: string;
  area_km2: number;
  risk_score: number;
  risk_level: 'LOW' | 'WATCH' | 'HIGH' | 'CRITICAL';
  rainfall_mm: number;
  total_complaints: number;
  infra_stress_score: number;
  top_driver: string;
  recommendation: ZoneRecommendation;
  geojson: any;
}

export interface CityOverview {
  city_name: string;
  total_zones: number;
  average_risk_score: number;
  critical_zones_count: number;
  high_risk_zones_count: number;
  active_anomalies_count: number;
  early_warning_lead_time_hours: number;
  detection_rate_percent: string;
  dataset_date_range: string;
  zones_summary: ZoneSummary[];
}

export interface SHAPContributor {
  feature: string;
  feature_name_human: string;
  value: number;
  shap_impact: number;
}

export interface ZoneExplanation {
  risk_score: number;
  risk_level: string;
  top_positive_contributors: SHAPContributor[];
  top_negative_contributors: SHAPContributor[];
  all_attributions: SHAPContributor[];
  human_explanation: string;
}

export interface TimelinePoint {
  date: string;
  risk_score: number;
  rainfall_mm: number;
  total_complaints: number;
  drainage_clogs: number;
  infra_stress_score: number;
  iso_anomaly_flag: number;
  incident_occurred: number;
}

export interface ZoneDetail {
  zone_id: string;
  name: string;
  type: string;
  area_km2: number;
  vulnerability: number;
  infra_age: number;
  current_risk_score: number;
  current_risk_level: string;
  explanation: ZoneExplanation;
  recommendation: ZoneRecommendation;
  geojson: any;
  timeline: TimelinePoint[];
}

export interface EarlyWarningAlert {
  zone_id: string;
  name: string;
  risk_score: number;
  risk_level: string;
  estimated_lead_time_hours: number;
  top_driver: string;
  explanation_summary: string;
  recommendation: ZoneRecommendation;
}

export interface SimulationResult {
  simulation_label: string;
  zone_id: string;
  zone_name: string;
  baseline_risk_score: number;
  baseline_risk_level: string;
  simulated_risk_score: number;
  simulated_risk_level: string;
  risk_score_delta: number;
  is_risk_reduced: boolean;
  percentage_risk_change: string;
  levers_applied: {
    complaint_reduction_pct: number;
    resolution_speedup_pct: number;
    infra_investment_delta: number;
    drainage_inspection_active: boolean;
  };
  assumptions: string;
}

export interface ModelMetrics {
  evaluation_metrics: {
    [modelName: string]: {
      precision: number;
      recall: number;
      f1: number;
      roc_auc: number;
      pr_auc: number;
      confusion_matrix: number[][];
      roc_curve: { fpr: number[]; tpr: number[] };
    };
  };
  early_warning_lead_time_metrics: {
    average_lead_time_days: number;
    average_lead_time_hours: number;
    detection_rate_percent: string;
    false_alarm_rate_percent: string;
  };
  selected_model: string;
  feature_list: string[];
}
