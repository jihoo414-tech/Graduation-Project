export const acceptedFormats = [
  'CSV: 한 번의 업로드에는 비식별 환자 1명만 포함할 수 있고, 여러 행은 여러 변이를 의미할 수 있습니다.',
  'JSON: deidentified_patient_id와 gene_variants[]를 포함한 환자 1명 객체를 업로드합니다.',
  '필수 변이 항목: gene, variant_classification',
  '선택 임상 정보는 함께 보낼 수 있으며, 정규화된 임상 정보 영역에 표시됩니다.',
];
