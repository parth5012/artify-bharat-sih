import { apiRequest, USE_MOCKS } from './apiClient';
import type { ReportFakeRequest } from '../types';

export async function reportFakeProduct(report: ReportFakeRequest): Promise<{ success: boolean; ticketId: string }> {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 500));
    return {
      success: true,
      ticketId: `REPORT-${Math.floor(100000 + Math.random() * 900000)}`,
    };
  }

  return apiRequest<{ success: boolean; ticketId: string }>('/api/v1/verify/report-fake', {
    method: 'POST',
    body: JSON.stringify(report),
  });
}
