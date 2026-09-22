import { apiRequest, USE_MOCKS } from './apiClient';
import { MOCK_DISTRICT_METRICS, MOCK_AUDIT_FEED, MOCK_PM_DAKSH_METRICS } from '../mocks/mockData';
import type { DistrictMetric, AuditFeedItem, PMDakshMetric } from '../types';

export async function getDistrictMetrics(): Promise<DistrictMetric[]> {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 300));
    return MOCK_DISTRICT_METRICS;
  }
  return apiRequest<DistrictMetric[]>('/api/v1/admin/districts');
}

export async function getJuryAuditFeed(): Promise<AuditFeedItem[]> {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 300));
    return MOCK_AUDIT_FEED;
  }
  return apiRequest<AuditFeedItem[]>('/api/v1/admin/jury-feed');
}

export async function getPMDakshMetrics(): Promise<PMDakshMetric[]> {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 300));
    return MOCK_PM_DAKSH_METRICS;
  }
  return apiRequest<PMDakshMetric[]>('/api/v1/admin/pm-daksh');
}
