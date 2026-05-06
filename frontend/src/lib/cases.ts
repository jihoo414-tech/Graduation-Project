import type { CaseStatus } from './demoJourney';

export type CaseListItem = {
  id: string;
  cancerType: string;
  updatedAt: string;
  status: CaseStatus;
};

export const caseStatusClassByLabel: Record<CaseStatus, string> = {
  '입력 구성 중': 'draft',
  '업로드 준비': 'draft',
  '분석 완료': 'done',
  '의사 검토 필요': 'review',
  '추가 입력 확인 필요': 'review',
};

export const filterCases = (cases: CaseListItem[], query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return cases;
  }

  return cases.filter((caseItem) =>
    `${caseItem.id} ${caseItem.cancerType} ${caseItem.status}`.toLowerCase().includes(normalizedQuery),
  );
};
