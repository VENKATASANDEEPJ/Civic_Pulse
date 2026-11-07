export type RiskLevel = 'LOW' | 'WATCH' | 'HIGH' | 'CRITICAL';

export interface ZoneRecommendation {
  risk_score: number;
  risk_level: RiskLevel;
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
  risk_level: RiskLevel;
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
  monitored_zones_count?: number;
  average_risk_score: number;
  critical_zones_count: number;
  high_risk_zones_count: number;
  watch_zones_count?: number;
  low_risk_zones_count?: number;
  active_anomalies_count: number;
  early_warning_lead_time_hours: number;
  detection_rate_percent: string;
  dataset_date_range: string;
  data_mode?: string;
  data_source_description?: string;
  is_synthetic?: boolean;
  last_processed_at?: string;
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
  alert_id: string;
  zone_id: string;
  name: string;
  severity: RiskLevel;
  risk_level: RiskLevel;
  risk_score: number;
  top_driver: string;
  explanation_summary: string;
  action_title?: string;
  sla?: string;
  recommended_steps?: string[];
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  notes?: string;
  estimated_lead_time_hours?: number;
  recommendation?: ZoneRecommendation;
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
  history_id?: number;
}

export interface ScenarioHistoryItem {
  id: number;
  timestamp: string;
  zone_id: string;
  zone_name: string;
  complaint_reduction_pct: number;
  resolution_speedup_pct: number;
  infra_investment_delta: number;
  drainage_inspection_active: number;
  baseline_risk_score: number;
  simulated_risk_score: number;
  risk_delta: number;
  baseline_risk_level: string;
  simulated_risk_level: string;
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

export interface DataRecordsResponse {
  items: any[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CsvValidationReport {
  filename: string;
  is_valid: boolean;
  issues: string[];
  total_rows: number;
  columns_found: string[];
  sample_preview: any[];
}

export interface AssessmentReport {
  report_title: string;
  generated_at: string;
  dataset_identifier: string;
  is_synthetic: boolean;
  assessment_period: string;
  zone_info: {
    zone_id: string;
    name: string;
    type: string;
    area_km2: number;
    vulnerability: number;
    infra_age_years: number;
  };
  risk_assessment: {
    estimated_risk_score: number;
    risk_classification: string;
    top_driver: string;
    primary_evidence: string;
    shap_contributors: SHAPContributor[];
  };
  observed_indicators_30d: {
    average_rainfall_mm: number;
    peak_rainfall_mm: number;
    average_daily_complaints: number;
    anomalies_detected: number;
    recorded_incidents: number;
  };
  active_alerts: EarlyWarningAlert[];
  recommended_actions: ZoneRecommendation;
  methodology_summary: string;
  disclaimer_and_limitations: string;
}
