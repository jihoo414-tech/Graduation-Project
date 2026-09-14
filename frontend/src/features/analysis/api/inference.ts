import { requestJson } from '../../../shared/api/client';
import type { InferenceUploadRequest } from '../model/request';
import type { ResultEnvelope } from '../model/result';

export const uploadModelFiles = async (
  mutationFile: File,
  expressionFile: File,
  clinical: InferenceUploadRequest,
  accessToken: string,
): Promise<ResultEnvelope> => {
  const formData = new FormData();
  formData.append('mutation_file', mutationFile);
  formData.append('expression_file', expressionFile);
  formData.append('patient_id', clinical.patientId);
  formData.append('birth_date', clinical.birthDate);
  formData.append('gender', clinical.gender);
  formData.append('stage', clinical.stage);

  return postInference(formData, accessToken);
};


const postInference = (formData: FormData, accessToken: string): Promise<ResultEnvelope> =>
  requestJson<ResultEnvelope>(
    '/api/v1/inference/upload',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    },
    '예상하지 못한 응답으로 업로드에 실패했습니다.',
  );
