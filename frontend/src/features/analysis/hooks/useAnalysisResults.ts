import { useEffect, useMemo, useState } from 'react';
import { normalizeUnknownError } from '../../../shared/api/errors';
import { deleteAnalysisResult, fetchAnalysisResults } from '../api/results';
import { filterAnalysisResults } from '../model/filterResults';
import type { AnalysisResultListItem } from '../model/savedResults';
import type { UserRole } from '../../../shared/types/auth';

export function useAnalysisResults(accessToken: string) {
  const [items, setItems] = useState<AnalysisResultListItem[]>([]);
  const [viewerRole, setViewerRole] = useState<UserRole>('patient');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [lowRiskCount, setLowRiskCount] = useState(0);

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchAnalysisResults(accessToken, page);
      setViewerRole(response.viewerRole);
      setItems(response.items);
      setPage(response.page);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setHighRiskCount(response.highRiskTotal);
      setLowRiskCount(response.lowRiskTotal);
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, [accessToken, page]);

  const removeResult = async (resultId: string) => {
    setError('');
    try {
      await deleteAnalysisResult(accessToken, resultId);
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
        return;
      }
      await loadResults();
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError).message);
    }
  };

  const filteredItems = useMemo(() => filterAnalysisResults(items, query), [items, query]);
  return {
    items,
    viewerRole,
    query,
    setQuery,
    loading,
    error,
    loadResults,
    filteredItems,
    highRiskCount,
    lowRiskCount,
    page,
    setPage,
    total,
    totalPages,
    removeResult,
  };
}
