export type PatientListItem = {
  id: string;
  createdAt: string;
  lastAnalysisAt: string | null;
  latestRiskGroup: 'High' | 'Low' | null;
  resultCount: number;
};

export type PatientListResponse = {
  items: PatientListItem[];
};
