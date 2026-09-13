export type Variant = {
  gene: string;
  variant_classification: string;
};

export type NormalizedClinical = {
  age: number | null;
  pathologic_stage: string | null;
  gender: string | null;
};

export type NormalizedPatientInput = {
  deidentified_patient_id: string;
  gene_variants?: Variant[];
  clinical: NormalizedClinical;
};
