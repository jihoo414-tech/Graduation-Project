import type { ReportStage } from './demoJourney';
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
  | '설명 준비 완료'
  | '추가 입력 확인 필요';

export type ExplanationAudience =
  | 'clinician'
  | 'patient'
  | 'anxious-patient'
  | 'detail-patient'
  | 'caregiver';

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

  return '설명 준비 완료';
};

export const buildPatientFriendlySummary = (result: ResultEnvelope) => {
  const confidenceLevel = buildConfidenceLevel(result);

  return [
    `현재 검사 결과를 종합하면 ${result.result.summary.risk_level}으로 분류되어 재발 가능성을 주의 깊게 볼 필요가 있습니다.`,
    `다만 이는 확정적인 재발을 의미하는 것은 아니며, 향후 경과 관찰과 추가 판단이 중요합니다.`,
    `현재 분석 신뢰 수준은 ${confidenceLevel}이며, 담당 전문의의 설명과 함께 이해하는 것이 가장 중요합니다.`,
  ].join(' ');
};

export const explanationAudienceLabels: Record<ExplanationAudience, string> = {
  clinician: '전문의용 요약',
  patient: '환자용 설명',
  'anxious-patient': '불안이 큰 환자용',
  'detail-patient': '자세히 알고 싶은 환자용',
  caregiver: '보호자 설명용',
};

export const buildExplanationSummary = (
  result: ResultEnvelope,
  audience: ExplanationAudience,
) => {
  const confidenceLevel = buildConfidenceLevel(result);
  const reviewStatus = buildReviewStatus(result);
  const probability3Year = Math.round(getTimepointProbability(getWorkspaceSurvivalCurve(result), 3) * 100);
  const clinicianSummary = buildClinicianSummary(result);

  switch (audience) {
    case 'clinician':
      return clinicianSummary;
    case 'anxious-patient':
      return [
        `현재 결과는 ${result.result.summary.risk_level}으로 분류되지만, 이것이 재발이 확정되었다는 뜻은 아닙니다.`,
        `지금 가장 중요한 것은 담당 전문의와 함께 결과를 차분히 해석하고 추적 계획을 세우는 것입니다.`,
        `현재 해석 신뢰 수준은 ${confidenceLevel}이며, 추가 임상정보가 들어오면 설명이 더 구체화될 수 있습니다.`,
      ].join(' ');
    case 'detail-patient':
      return [
        `현재 결과는 ${result.result.summary.risk_level}이며 위험 점수는 ${result.result.summary.risk_score.toFixed(2)}입니다.`,
        `현재 입력 기준으로 3년 시점 예상 무사건 확률은 약 ${probability3Year}% 수준으로 요약할 수 있습니다.`,
        `다만 이 결과는 확정 진단이 아니라 위험 예측 보조정보이며, ${reviewStatus} 상태로 전문의의 최종 해석이 함께 필요합니다.`,
      ].join(' ');
    case 'caregiver':
      return [
        `현재 결과는 ${result.result.summary.risk_level}으로 요약되며, 환자분의 경과를 더 주의 깊게 확인할 필요가 있습니다.`,
        `이 수치는 앞으로의 가능성을 보는 참고정보이지 결과를 단정하는 수치가 아닙니다.`,
        `가족/보호자 입장에서는 추적 진료 일정과 담당 전문의 설명을 함께 확인하는 것이 중요합니다.`,
      ].join(' ');
    case 'patient':
    default:
      return buildPatientFriendlySummary(result);
  }
};

export const buildCounselingChecklist = (result: ResultEnvelope) => {
  const missingFields = getMissingClinicalFields(result);
  const reviewStatus = buildReviewStatus(result);

  return [
    `결과는 ${result.result.summary.risk_level}이지만 확정 진단이 아니라는 점을 먼저 설명하기`,
    `현재 권장 검토 상태(${reviewStatus})와 추적 관찰 필요성을 안내하기`,
    missingFields.length > 0
      ? `누락된 정보(${missingFields.join(', ')}) 때문에 해석에 제한이 있음을 함께 알리기`
      : '입력 임상정보가 포함되어 해석 안정성을 보조한다는 점을 알리기',
  ];
};

export const buildCommunicationTips = (audience: ExplanationAudience) => {
  if (audience === 'clinician') {
    return [
      '위험도 → 주요 요인 → 추적 계획 순서로 설명하세요.',
      '확정 진단이 아니라는 점을 문서와 구두 설명 모두에 유지하세요.',
    ];
  }

  if (audience === 'anxious-patient') {
    return [
      '단정적 표현을 피하고 “가능성”이라는 표현을 유지하세요.',
      '다음 진료/추적 계획을 함께 제시해 불확실성을 줄이세요.',
    ];
  }

  if (audience === 'detail-patient') {
    return [
      '수치와 의미를 함께 설명하세요.',
      '근거와 한계를 짝지어 설명하면 신뢰가 높아집니다.',
    ];
  }

  if (audience === 'caregiver') {
    return [
      '환자 대신 기억해야 할 추적 일정과 확인 포인트를 정리하세요.',
      '불안 조장보다 돌봄 관점의 다음 액션을 명확히 제시하세요.',
    ];
  }

  return [
    '짧고 명확한 문장을 사용하세요.',
    '담당 전문의 설명과 함께 이해해야 한다는 점을 유지하세요.',
  ];
};

export const buildModelPlaceholderNotes = (result: ResultEnvelope) => [
  `현재 연결된 adapter: ${result.result.adapter}`,
  '향후 실제 모델 연결 시 HR/95% CI, 선택 feature, calibration summary를 같은 자리에서 표시할 수 있도록 슬롯을 비워두었습니다.',
  '현재 결과는 mock adapter 기반이므로 모델별 상세 지표는 표시하지 않습니다.',
];

export const buildReportStageNotes = (stage: ReportStage) => {
  if (stage === 'patient-ready') {
    return '환자 설명과 출력 문구까지 정리된 공유용 상태입니다.';
  }

  if (stage === 'clinician-reviewed') {
    return '전문의 검토를 반영해 설명 문구와 주요 포인트를 다듬은 상태입니다.';
  }

  return '기본 결과를 정리한 초안 상태입니다.';
};
