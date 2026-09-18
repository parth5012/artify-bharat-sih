import { apiRequest, USE_MOCKS } from './apiClient';
import type { JuryStatus, ReportFakeRequest, ReportFakeResponse } from '../types';

/** Backend shape (single ReportFake in/out, Wayfinder #100). */
interface BackendReportFakeResponse {
  report_id: string;
  ticketId?: string;
  success?: boolean;
  status: string;
  flagged_hash?: string;
}

export async function reportFakeProduct(
  report: ReportFakeRequest,
): Promise<ReportFakeResponse> {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 500));
    return {
      success: true,
      ticketId: `REPORT-${Math.floor(100000 + Math.random() * 900000)}`,
    };
  }

  // Map frontend contract -> backend contract (aliases accepted server-side):
  // shortcode -> shortcode_or_hash, reporterContact -> reporter_phone,
  // reason+description merged server-side via full_reason().
  const data = await apiRequest<BackendReportFakeResponse>(
    '/api/v1/verify/report-fake',
    {
      method: 'POST',
      body: JSON.stringify({
        shortcode: report.shortcode,
        shortcode_or_hash: report.shortcode,
        product_id: report.productId,
        reason: report.reason,
        description: report.description,
        reporterContact: report.reporterContact,
        reporter_phone: report.reporterContact,
      }),
    },
  );
  // ticketId (frontend) maps 1:1 to report_id (backend).
  const ticketId = data.ticketId ?? data.report_id;
  return {
    success: data.success ?? true,
    ticketId,
    report_id: data.report_id,
    status: data.status,
  };
}

/** Poll jury/report status (DB source — survives restarts). */
export async function getJuryStatus(juryTicketId: string): Promise<JuryStatus> {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 300));
    return {
      jury_ticket_id: juryTicketId,
      product_id: 'mock-product',
      status: 'IN_PROGRESS',
      votes_received: 0,
      quorum_size: 3,
      last_updated: new Date().toISOString(),
    };
  }
  return apiRequest<JuryStatus>(`/api/v1/verify/jury/status/${juryTicketId}`);
}
