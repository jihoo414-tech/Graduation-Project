export const acceptedFormats = [
  'CSV: one deidentified patient per upload; repeated rows may represent multiple variants.',
  'JSON: one patient object with deidentified_patient_id and gene_variants[].',
  'Required variant fields: gene, variant_classification.',
  'Optional clinical fields may be included and will appear in the normalized clinical section.',
];
