import type { ResultEnvelope, SurvivalCurve, SurvivalCurvePoint, Variant } from './types';

export type FactorDirection = '위험 증가' | '위험 감소' | '중립/참고';

export type WorkspaceFactor = {
  label: string;
  direction: FactorDirection;
  weight: number;
  note: string;
};

export type VariantExplanationRow = {
  gene: string;
  variant_classification: string;
  direction: FactorDirection;
  note: string;
};

export type ConfidenceLevel = '높음' | '중간' | '낮음';

export type ReviewStatus =
  | '의사 검토 필요'
  | '검토 진행 가능'
  | '추가 입력 확인 필요';

const missingClinicalLabels: Record<string, string> = {
  age: '나이',
  pathologic_stage: '병리학적 병기',
  gender: '성별',
};

const stageLooksHighRisk = (stage: string | null) => {
  if (!stage) {
    return false;
  }

  return /ii|iii|iv/i.test(stage);
};

const stageLooksLowRisk = (stage: string | null) => {
  if (!stage) {
    return false;
  }

  return /^i/i.test(stage);
};

const uniqueGeneNames = (variants: Variant[]) => [...new Set(variants.map((variant) => variant.gene))];

export const buildGeneratedSurvivalCurve = (result: ResultEnvelope): SurvivalCurve => {
  const riskScore = result.result.summary.risk_score;
  const points: SurvivalCurvePoint[] = Array.from({ length: 6 }, (_, index) => {
    const time = index;
    const decay = Math.exp(-(0.12 + riskScore * 0.22) * time);
    const survival_probability = Number(Math.max(0.05, Math.min(1, decay)).toFixed(3));

    return { time, survival_probability };
  });

  return {
    label: '예상 무사건 확률 (프로토타입 보조 추정)',
    points,
  };
};

export const getWorkspaceSurvivalCurve = (result: ResultEnvelope): SurvivalCurve =>
  result.result.artifacts.survival_curve ?? buildGeneratedSurvivalCurve(result);

export const getTimepointProbability = (curve: SurvivalCurve, year: number) => {
  const exactPoint = curve.points.find((point) => point.time === year);
  if (exactPoint) {
    return exactPoint.survival_probability;
  }

  const sortedPoints = [...curve.points].sort((left, right) => left.time - right.time);
  const nearestPoint = sortedPoints.reduce<SurvivalCurvePoint | null>((currentNearest, point) => {
    if (!currentNearest) {
      return point;
    }

    return Math.abs(point.time - year) < Math.abs(currentNearest.time - year) ? point : currentNearest;
  }, null);

  return nearestPoint?.survival_probability ?? 0;
};

export const getMissingClinicalFields = (result: ResultEnvelope) => {
  const clinical = result.normalized_input.clinical;

  return Object.entries(clinical)
    .filter(([, value]) => value === null || value === undefined)
    .map(([key]) => missingClinicalLabels[key] ?? key);
};

export const buildInputWarnings = (result: ResultEnvelope) => {
  const missingFields = getMissingClinicalFields(result);

  return [...result.warnings, ...missingFields.map((field) => `${field} 정보가 입력되지 않았습니다.`)];
};

export const buildPatientInputSummary = (result: ResultEnvelope) => {
  const clinical = result.normalized_input.clinical;

  return {
    patientId: result.patient.deidentified_patient_id,
    variantCount: result.normalized_input.gene_variants.length,
    geneNames: uniqueGeneNames(result.normalized_input.gene_variants),
    clinicalSummary: [
      clinical.age !== null ? `나이 ${clinical.age}세` : null,
      clinical.pathologic_stage ? `병기 ${clinical.pathologic_stage}` : null,
      clinical.gender ? `성별 ${clinical.gender}` : null,
    ].filter((value): value is string => Boolean(value)),
    warnings: buildInputWarnings(result),
  };
};

export const buildWorkspaceFactors = (result: ResultEnvelope) => {
  const clinical = result.normalized_input.clinical;
  const variants = result.normalized_input.gene_variants;

  const increaseFactors: WorkspaceFactor[] = variants.slice(0, 2).map((variant, index) => ({
    label: `${variant.gene} ${variant.variant_classification}`,
    direction: '위험 증가',
    weight: 0.75 - index * 0.12,
    note: '프로토타입 기준 주요 설명 요인으로 정리되었습니다.',
  }));

  if (stageLooksHighRisk(clinical.pathologic_stage)) {
    increaseFactors.push({
      label: `병리학적 병기 ${clinical.pathologic_stage}`,
      direction: '위험 증가',
      weight: 0.58,
      note: '상대위험도 해석에서 위험 증가 방향으로 반영되었습니다.',
    });
  }

  if (clinical.age !== null && clinical.age >= 65) {
    increaseFactors.push({
      label: `나이 ${clinical.age}세`,
      direction: '위험 증가',
      weight: 0.44,
      note: '고령 입력 정보가 보수적으로 해석되었습니다.',
    });
  }

  const decreaseFactors: WorkspaceFactor[] = [];

  if (stageLooksLowRisk(clinical.pathologic_stage)) {
    decreaseFactors.push({
      label: `병리학적 병기 ${clinical.pathologic_stage}`,
      direction: '위험 감소',
      weight: 0.41,
      note: '상대적으로 낮은 병기가 감소 방향으로 반영되었습니다.',
    });
  }

  if (clinical.age !== null && clinical.age < 65) {
    decreaseFactors.push({
      label: `나이 ${clinical.age}세`,
      direction: '위험 감소',
      weight: 0.26,
      note: '상대적으로 낮은 연령 정보가 보조 요인으로 고려되었습니다.',
    });
  }

  if (variants.length <= 1) {
    decreaseFactors.push({
      label: '제한된 변이 수',
      direction: '위험 감소',
      weight: 0.19,
      note: '입력 변이 수가 적어 설명 강도가 완화되었습니다.',
    });
  }

  if (decreaseFactors.length === 0) {
    decreaseFactors.push({
      label: '뚜렷한 감소 요인 없음',
      direction: '중립/참고',
      weight: 0.1,
      note: '현재 입력 기준으로 감소 방향 요인은 제한적으로 해석됩니다.',
    });
  }

  return { increaseFactors, decreaseFactors };
};

export const buildVariantExplanationRows = (result: ResultEnvelope): VariantExplanationRow[] => {
  const increaseFactorLabels = new Set(buildWorkspaceFactors(result).increaseFactors.map((factor) => factor.label));

  return result.normalized_input.gene_variants.map((variant, index) => {
    const composedLabel = `${variant.gene} ${variant.variant_classification}`;
    const isIncrease = increaseFactorLabels.has(composedLabel) || index < 2;

    return {
      gene: variant.gene,
      variant_classification: variant.variant_classification,
      direction: isIncrease ? '위험 증가' : '중립/참고',
      note: isIncrease
        ? '프로토타입 결과 요약에서 주요 반영 요인으로 사용되었습니다.'
        : '설명 참고용 변이로 표시되었습니다.',
    };
  });
};

export const buildClinicianSummary = (result: ResultEnvelope) => {
  const curve = getWorkspaceSurvivalCurve(result);
  const probability3Year = getTimepointProbability(curve, 3);
  const geneNames = uniqueGeneNames(result.normalized_input.gene_variants).join(', ');
  const missingFields = getMissingClinicalFields(result);

  return [
    `비식별 환자 ${result.patient.deidentified_patient_id}는 현재 모델 기준 ${result.result.summary.risk_level}으로 분류됩니다.`,
    `위험 점수는 ${result.result.summary.risk_score.toFixed(2)}이며, 주요 해석 요인으로 ${geneNames || '입력 변이 정보'}가 반영되었습니다.`,
    `3년 시점 예상 무사건 확률은 ${Math.round(probability3Year * 100)}% 수준으로 요약할 수 있습니다.`,
    missingFields.length > 0
      ? `누락된 입력: ${missingFields.join(', ')}. 결과는 일부 임상정보가 비어 있는 상태에서 해석되었습니다.`
      : '입력 임상정보가 포함되어 해석 안정성을 보조합니다.',
    '본 결과는 진단이 아닌 위험 예측 보조정보이며 최종 판단은 담당 의료진의 임상 해석과 함께 이루어져야 합니다.',
  ].join(' ');
};

export const buildConfidenceLevel = (result: ResultEnvelope): ConfidenceLevel => {
  const missingFields = getMissingClinicalFields(result).length;
  const warningCount = result.warnings.length;

  if (missingFields === 0 && warningCount === 0) {
    return '높음';
  }

  if (missingFields <= 1 && warningCount <= 1) {
    return '중간';
  }

  return '낮음';
};

export const buildReviewStatus = (result: ResultEnvelope): ReviewStatus => {
  const confidenceLevel = buildConfidenceLevel(result);

  if (confidenceLevel === '낮음') {
    return '추가 입력 확인 필요';
  }

  if (/고/i.test(result.result.summary.risk_level)) {
    return '의사 검토 필요';
  }

  return '검토 진행 가능';
};

export const buildModelPlaceholderNotes = (result: ResultEnvelope) => [
  `현재 연결된 adapter: ${result.result.adapter}`,
  '향후 실제 모델 연결 시 HR/95% CI, 선택 feature, calibration summary를 같은 자리에서 표시할 수 있도록 슬롯을 비워두었습니다.',
  '현재 결과는 mock adapter 기반이므로 모델별 상세 지표는 표시하지 않습니다.',
];
