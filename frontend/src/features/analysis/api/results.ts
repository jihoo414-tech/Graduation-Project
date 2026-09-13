import { requestJson } from '../../../shared/api/client';
import type { AnalysisResultsResponse } from '../model/savedResults';

export function fetchAnalysisResults(accessToken: string): Promise<AnalysisResultsResponse> {
  return requestJson<AnalysisResultsResponse>(
    '/api/v1/analysis-results',
    { headers: { Authorization: `Bearer ${accessToken}` } },
    '분석 결과 목록을 불러오지 못했습니다.',
  );
}
