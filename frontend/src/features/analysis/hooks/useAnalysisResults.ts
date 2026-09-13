import { useEffect, useMemo, useState } from 'react';
import { normalizeUnknownError } from '../../../shared/api/errors';
import { fetchAnalysisResults } from '../api/results';
import { filterAnalysisResults } from '../model/filterResults';
import type { AnalysisResultListItem } from '../model/savedResults';
import type { UserRole } from '../../../shared/types/auth';

export function useAnalysisResults(accessToken: string) {
  const [items, setItems] = useState<AnalysisResultListItem[]>([]);
  const [viewerRole, setViewerRole] = useState<UserRole>('patient');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchAnalysisResults(accessToken);
      setViewerRole(response.viewerRole);
      setItems(response.items);
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, [accessToken]);

  const filteredItems = useMemo(() => filterAnalysisResults(items, query), [items, query]);
  const highRiskCount = items.filter((item) => item.riskGroup === 'High').length;
  const lowRiskCount = items.filter((item) => item.riskGroup === 'Low').length;


  return { items, viewerRole, query, setQuery, loading, error, loadResults, filteredItems, highRiskCount, lowRiskCount };
}
