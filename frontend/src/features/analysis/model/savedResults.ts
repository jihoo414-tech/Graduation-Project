import type { UserRole } from '../../../shared/types/auth';
import type { ResultEnvelope } from './result';

export type AnalysisResultListItem = {
  id: string;
  createdAt: string;
  patientId: string | null;
  patientName: string | null;
  riskGroup: 'High' | 'Low' | null;
  riskScore: number | null;
  age: number | null;
  gender: string | null;
  stage: string | null;
  variantCount: number | null;
  resultPayload: ResultEnvelope | null;
};

export type AnalysisResultsResponse = {
  viewerRole: UserRole;
  items: AnalysisResultListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  highRiskTotal: number;
  lowRiskTotal: number;
};
