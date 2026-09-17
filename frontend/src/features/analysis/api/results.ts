import { requestJson, requestNoContent } from '../../../shared/api/client';
import type { AnalysisResultsResponse } from '../model/savedResults';

export function fetchAnalysisResults(
  accessToken: string,
  page = 1,
): Promise<AnalysisResultsResponse> {
  return requestJson<AnalysisResultsResponse>(
    `/api/v1/analysis-results?page=${page}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    '분석 결과 목록을 불러오지 못했습니다.',
  );
}

export function deleteAnalysisResult(accessToken: string, resultId: string): Promise<void> {
  return requestNoContent(
    `/api/v1/analysis-results/${resultId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
    '분석 결과를 삭제하지 못했습니다.',
  );
}
