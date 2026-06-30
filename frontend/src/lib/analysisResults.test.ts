import { describe, expect, it } from 'vitest';
import { filterAnalysisResults, type AnalysisResultListItem } from './analysisResults';

const item = (overrides: Partial<AnalysisResultListItem>): AnalysisResultListItem => ({
  id: 'row-1',
  createdAt: '2026-06-30T00:00:00Z',
  patientId: 'P-001',
  riskGroup: 'High',
  riskScore: 1.23,
  age: 67,
  gender: 'female',
  stage: '3',
  resultPayload: null,
  ...overrides,
});

describe('filterAnalysisResults', () => {
  it('filters saved results by patient id, risk group, stage, gender, or age', () => {
    const items = [
      item({ id: 'row-1', patientId: 'P-001', riskGroup: 'High', stage: '3', gender: 'female', age: 67 }),
      item({ id: 'row-2', patientId: 'P-002', riskGroup: 'Low', stage: '1', gender: 'male', age: 51 }),
    ];

    expect(filterAnalysisResults(items, 'p-002')).toEqual([items[1]]);
    expect(filterAnalysisResults(items, 'low')).toEqual([items[1]]);
    expect(filterAnalysisResults(items, 'stage 3')).toEqual([items[0]]);
    expect(filterAnalysisResults(items, '67세')).toEqual([items[0]]);
  });

  it('keeps the full list when the query is blank', () => {
    const items = [item({ id: 'row-1' }), item({ id: 'row-2' })];

    expect(filterAnalysisResults(items, '   ')).toEqual(items);
  });
});
