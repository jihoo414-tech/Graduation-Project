import { useEffect, useMemo, useState } from 'react';
import { normalizeUnknownError } from '../../../shared/api/errors';
import { deletePatient, fetchPatients } from '../api/patients';
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
    return keyword
      ? items.filter((item) =>
          item.fullName?.toLowerCase().includes(keyword))
      : items;
  }, [items, query]);

  const removePatient = async (patientId: string) => {
    setError('');
    try {
      await deletePatient(accessToken, patientId);
      await loadPatients();
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError).message);
    }
  };

  return { items, filteredItems, query, setQuery, loading, error, loadPatients, removePatient };
}
