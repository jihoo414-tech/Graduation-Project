import { requestJson, requestNoContent } from '../../../shared/api/client';
import type { PatientListResponse } from '../model/patients';

export function fetchPatients(accessToken: string): Promise<PatientListResponse> {
  return requestJson<PatientListResponse>(
    '/api/v1/patients',
    { headers: { Authorization: `Bearer ${accessToken}` } },
    '등록된 환자 목록을 불러오지 못했습니다.',
  );
}

export function deletePatient(accessToken: string, patientId: string): Promise<void> {
  return requestNoContent(
    `/api/v1/patients/${patientId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
    '환자 등록을 해제하지 못했습니다.',
  );
}
