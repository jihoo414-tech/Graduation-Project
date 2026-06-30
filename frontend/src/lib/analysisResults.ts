import type { ResultEnvelope } from './types';
import { supabase } from './supabase';

export type AnalysisResultListItem = {
  id: string;
  createdAt: string;
  patientId: string;
  riskGroup: 'High' | 'Low' | null;
  riskScore: number | null;
  age: number | null;
  gender: string | null;
  stage: string | null;
  resultPayload: ResultEnvelope | null;
};

type AnalysisResultRow = {
  id: string;
  created_at: string;
  patient_id: string;
  risk_group: 'High' | 'Low' | null;
  risk_score: number | null;
  age: number | null;
  gender: string | null;
  stage: string | null;
  result_payload: ResultEnvelope | null;
};

const LIST_COLUMNS = [
  'id',
  'created_at',
  'patient_id',
  'risk_group',
  'risk_score',
  'age',
  'gender',
  'stage',
  'result_payload',
].join(', ');

export async function fetchAnalysisResults(): Promise<AnalysisResultListItem[]> {
  if (!supabase) {
    throw new Error('Supabase 연결값이 필요합니다.');
  }

  const { data, error } = await supabase
    .from('analysis_results')
    .select(LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message || '분석 결과 목록을 불러오지 못했습니다.');
  }

  return ((data ?? []) as unknown as AnalysisResultRow[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    patientId: row.patient_id,
    riskGroup: row.risk_group,
    riskScore: row.risk_score,
    age: row.age,
    gender: row.gender,
    stage: row.stage,
    resultPayload: row.result_payload,
  }));
}

export function filterAnalysisResults(
  items: AnalysisResultListItem[],
  query: string,
): AnalysisResultListItem[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return items;

  return items.filter((item) =>
    [
      item.patientId,
      item.riskGroup,
      item.stage ? `stage ${item.stage}` : null,
      item.gender,
      item.age === null ? null : `${item.age}세`,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(keyword)),
  );
}
