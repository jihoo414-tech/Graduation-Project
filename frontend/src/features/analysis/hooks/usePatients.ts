import { useEffect, useMemo, useState } from 'react';
import { normalizeUnknownError } from '../../../shared/api/errors';
import { fetchPatients } from '../api/patients';
import type { PatientListItem } from '../model/patients';

export function usePatients(accessToken: string) {
  const [items, setItems] = useState<PatientListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPatients = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchPatients(accessToken);
      setItems(response.items);
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, [accessToken]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword ? items.filter((item) => item.id.toLowerCase().includes(keyword)) : items;
  }, [items, query]);

  return { items, filteredItems, query, setQuery, loading, error, loadPatients };
}
