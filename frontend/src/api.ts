import axios from 'axios';
import {
  CityOverview,
  ZoneDetail,
  EarlyWarningAlert,
  SimulationResult,
  ScenarioHistoryItem,
  ModelMetrics,
  DataRecordsResponse,
  CsvValidationReport,
  AssessmentReport,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  getOverview: async (filters?: {
    zone_id?: string;
    risk_level?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<CityOverview> => {
    const res = await client.get<CityOverview>('/overview', { params: filters });
    return res.data;
  },

  getZoneDetail: async (zoneId: string): Promise<ZoneDetail> => {
    const res = await client.get<ZoneDetail>(`/zones/${zoneId}`);
    return res.data;
  },

  getWarnings: async (filters?: {
    status?: string;
    severity?: string;
    zone_id?: string;
    search?: string;
  }): Promise<{ active_warnings: EarlyWarningAlert[]; early_warning_metrics: any }> => {
    const res = await client.get('/warnings', { params: filters });
    return res.data;
  },

  acknowledgeAlert: async (alertId: string, notes?: string): Promise<any> => {
    const res = await client.post(`/warnings/${alertId}/acknowledge`, { notes });
    return res.data;
  },

  resolveAlert: async (alertId: string, notes?: string): Promise<any> => {
    const res = await client.post(`/warnings/${alertId}/resolve`, { notes });
    return res.data;
  },

  getModelMetrics: async (): Promise<ModelMetrics> => {
    const res = await client.get<ModelMetrics>('/model/metrics');
    return res.data;
  },

  getAnomalies: async (zoneId?: string): Promise<any> => {
    const res = await client.get('/anomalies', { params: { zone_id: zoneId } });
    return res.data;
  },

  getDataSummary: async (): Promise<any> => {
    const res = await client.get('/data/summary');
    return res.data;
  },

  getRecords: async (params: {
    page: number;
    page_size: number;
    zone_id?: string;
    sort_by?: string;
    sort_desc?: boolean;
    search?: string;
  }): Promise<DataRecordsResponse> => {
    const res = await client.get<DataRecordsResponse>('/data/records', { params });
    return res.data;
  },

  simulateScenario: async (payload: {
    zone_id: string;
    complaint_reduction_pct: number;
    resolution_speedup_pct: number;
    infra_investment_delta: number;
    drainage_inspection_active: boolean;
  }): Promise<SimulationResult> => {
    const res = await client.post<SimulationResult>('/simulate', payload);
    return res.data;
  },

  getScenarioHistory: async (limit: number = 15): Promise<ScenarioHistoryItem[]> => {
    const res = await client.get<ScenarioHistoryItem[]>('/scenarios/history', { params: { limit } });
    return res.data;
  },

  validateCsv: async (file: File): Promise<CsvValidationReport> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post<CsvValidationReport>('/data/validate-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  uploadCsv: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post('/data/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  resetDataset: async (): Promise<any> => {
    const res = await client.post('/data/reset');
    return res.data;
  },

  generateReport: async (zoneId: string, assessmentPeriod?: string): Promise<AssessmentReport> => {
    const res = await client.get<AssessmentReport>('/reports/generate', {
      params: { zone_id: zoneId, assessment_period: assessmentPeriod },
    });
    return res.data;
  },

  getExportCsvUrl: (zoneId?: string): string => {
    const base = `${API_BASE_URL}/data/export-csv`;
    return zoneId && zoneId !== 'ALL' ? `${base}?zone_id=${zoneId}` : base;
  },
};
