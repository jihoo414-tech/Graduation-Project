export type PatientListItem = {
  id: string;
  fullName: string | null;
  createdAt: string;
  lastAnalysisAt: string | null;
  latestRiskGroup: 'High' | 'Low' | null;
  resultCount: number;
};

export type PatientListResponse = {
  items: PatientListItem[];
};
