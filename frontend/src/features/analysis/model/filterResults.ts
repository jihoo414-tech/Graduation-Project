import type { AnalysisResultListItem } from './savedResults';

export function filterAnalysisResults(
  items: AnalysisResultListItem[],
  query: string,
): AnalysisResultListItem[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return items;

  return items.filter((item) =>
    [
      item.patientName,
      item.riskGroup,
      item.stage ? `stage ${item.stage}` : null,
      item.gender,
      item.age === null ? null : `${item.age}세`,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(keyword)),
  );
}
