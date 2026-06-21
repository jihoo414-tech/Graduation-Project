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

export type ExpressionScores = {
  stromal: number;
  immune: number;
};

export type ResultEnvelope = {
  result_version: 'v1' | 'v2';
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
      model_scores?: Record<string, { raw: number; z_score: number }>;
      ensemble_score?: number;
      risk_group?: 'High' | 'Low';
      risk_threshold?: number;
      expression_scores?: ExpressionScores;
      [key: string]: unknown;
    };
  };
  warnings: string[];
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
