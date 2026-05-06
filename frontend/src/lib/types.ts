export type Variant = {
  gene: string;
  variant_classification: string;
};

export type UploadPatientInput = {
  deidentified_patient_id: string;
  gene_variants: Variant[];
  age?: number;
  pathologic_stage?: string;
  gender?: string;
};

export type NormalizedClinical = {
  age: number | null;
  pathologic_stage: string | null;
  gender: string | null;
};

export type NormalizedPatientInput = {
  deidentified_patient_id: string;
  gene_variants: Variant[];
  clinical: NormalizedClinical;
};

export type SurvivalCurvePoint = {
  time: number;
  survival_probability: number;
};

export type SurvivalCurve = {
  label: string;
  points: SurvivalCurvePoint[];
  [key: string]: unknown;
};

export type ResultEnvelope = {
  result_version: 'v1';
  patient: {
    deidentified_patient_id: string;
  };
  normalized_input: NormalizedPatientInput;
  result: {
    adapter: string;
    summary: {
      risk_level: string;
      risk_score: number;
      text: string;
    };
    artifacts: {
      survival_curve: SurvivalCurve | null;
      [key: string]: unknown;
    };
  };
  warnings: string[];
};

export type ContractExamplesResponse = {
  csv_example: string;
  json_example: UploadPatientInput;
  envelope_example: ResultEnvelope;
};

export type BackendErrorDetail = {
  field?: string;
  rule?: string;
};

export type BackendError = {
  error: {
    code: string;
    message: string;
    details?: BackendErrorDetail[];
  };
};
