import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

const result = {
  result_version: 'v2', patient: { deidentified_patient_id: 'P-001' },
  normalized_input: { deidentified_patient_id: 'P-001', gene_variants: [{ gene: 'TP53', variant_classification: 'Mutation_Present' }], clinical: { age: 67, pathologic_stage: '2', gender: 'male' } },
  result: { adapter: 'real_ensemble', summary: { risk_level: '낮은 위험', risk_score: -0.25, text: '' }, artifacts: { survival_curve: { label: 'Low risk Kaplan-Meier reference', points: [{ time: 0, survival_probability: 1 }, { time: 365, survival_probability: 0.8 }] }, model_scores: { cox: { raw: 1, z_score: 0.1 }, rsf: { raw: 2, z_score: 0.2 }, deepsurv: { raw: 3, z_score: 0.3 } }, ensemble_score: -0.25, risk_group: 'Low', risk_threshold: 0, expression_scores: { stromal: 1.2, immune: 2.3 } } }, warnings: [],
} as const;

it('submits only required inputs and renders the real ensemble result', async () => {
  vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
  render(<App />);
  fireEvent.change(screen.getByLabelText('출생 연도'), { target: { value: '1960' } });
  fireEvent.change(screen.getByLabelText('출생 월'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('출생 일'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('성별'), { target: { value: 'male' } });
  fireEvent.change(screen.getByLabelText('암 병기'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  fireEvent.change(screen.getByLabelText('돌연변이 유무 CSV'), { target: { files: [new File(['x'], 'mutation.csv', { type: 'text/csv' })] } });
  fireEvent.change(screen.getByLabelText('RNA-seq 발현량 CSV'), { target: { files: [new File(['x'], 'expression.csv', { type: 'text/csv' })] } });
  fireEvent.click(screen.getByRole('button', { name: '실제 모델 분석 실행' }));
  expect(await screen.findByRole('heading', { name: '앙상블 분석 결과' })).toBeInTheDocument();
  expect(screen.getByText('Low Risk')).toBeInTheDocument();
  expect(screen.getByText('1.2000')).toBeInTheDocument();
});
