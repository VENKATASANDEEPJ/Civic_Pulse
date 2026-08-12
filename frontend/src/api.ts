import axios from 'axios';
import {
  CityOverview,
  ZoneDetail,
  EarlyWarningAlert,
  SimulationResult,
  ModelMetrics,
} from './types';

const API_BASE_URL = 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  getOverview: async (): Promise<CityOverview> => {
    const res = await client.get<CityOverview>('/overview');
    return res.data;
  },

  getZoneDetail: async (zoneId: string): Promise<ZoneDetail> => {
    const res = await client.get<ZoneDetail>(`/zones/${zoneId}`);
    return res.data;
  },

  getWarnings: async (): Promise<{ active_warnings: EarlyWarningAlert[]; early_warning_metrics: any }> => {
    const res = await client.get('/warnings');
    return res.data;
  },

  getModelMetrics: async (): Promise<ModelMetrics> => {
    const res = await client.get<ModelMetrics>('/model/metrics');
    return res.data;
  },

  getAnomalies: async (): Promise<any> => {
    const res = await client.get('/anomalies');
    return res.data;
  },

  getDataSummary: async (): Promise<any> => {
    const res = await client.get('/data/summary');
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
};
