import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../shared/api/errors';
import type { ResultEnvelope } from '../features/analysis/model/result';
import App from './App';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  uploadModelFiles: vi.fn(),
  fetchAnalysisResults: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('../features/auth/api/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: mocks.unsubscribe } } }),
    },
  },
}));
vi.mock('../features/analysis/api/inference', () => ({ uploadModelFiles: mocks.uploadModelFiles }));
vi.mock('../features/analysis/api/results', () => ({ fetchAnalysisResults: mocks.fetchAnalysisResults }));

const result: ResultEnvelope = {
  result_version: 'v2',
  patient: { deidentified_patient_id: 'P-001' },
  normalized_input: {
    deidentified_patient_id: 'P-001',
    gene_variants: [],
    clinical: { age: 50, gender: 'female', pathologic_stage: '1' },
  },
  result: {
    adapter: 'real_ensemble',
    summary: { risk_level: 'Low', risk_score: 0.1, text: 'test' },
    artifacts: { risk_group: 'Low', ensemble_score: 0.1, survival_curve: null },
  },
  warnings: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: 'test-token', user: { email: 'test@example.com' } } },
  });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.fetchAnalysisResults.mockResolvedValue({
    viewerRole: 'admin',
    items: [{
      id: 'row-1', createdAt: '2026-09-13T00:00:00Z', patientId: 'P-001',
      riskGroup: 'Low', riskScore: 0.1, age: 50, gender: 'female', stage: '1',
      variantCount: 0, resultPayload: result,
    }],
  });
});

afterEach(cleanup);

async function fillAnalysis(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: '새 분석' });
  await user.selectOptions(screen.getByLabelText('출생 연도'), '1990');
  await user.selectOptions(screen.getByLabelText('출생 월'), '1');
  await user.selectOptions(screen.getByLabelText('출생 일'), '2');
  await user.selectOptions(screen.getByLabelText('성별'), 'female');
  await user.selectOptions(screen.getByLabelText('병기'), '1');
  await user.click(screen.getByRole('button', { name: '다음 단계' }));
  const mutation = new File(['mutation'], 'mutation.csv', { type: 'text/csv' });
  const expression = new File(['expression'], 'expression.csv', { type: 'text/csv' });
  await user.upload(screen.getByLabelText('돌연변이 유전자 CSV'), mutation);
  await user.upload(screen.getByLabelText('RNA-seq 발현량 CSV'), expression);
  return { mutation, expression };
}

describe('analysis navigation', () => {
  it('validates input, submits files, shows progress and resets a completed analysis', async () => {
    let complete!: (value: ResultEnvelope) => void;
    mocks.uploadModelFiles.mockReturnValue(new Promise<ResultEnvelope>((resolve) => { complete = resolve; }));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: '새 분석' });
    await user.click(screen.getByRole('button', { name: '다음 단계' }));
    expect(screen.getByText('입력값을 다시 확인해 주세요.')).toBeInTheDocument();
    const { mutation, expression } = await fillAnalysis(user);
    await user.click(screen.getByRole('button', { name: '분석 실행' }));
    expect(screen.getByRole('heading', { name: '분석 진행 중' })).toBeInTheDocument();
    expect(mocks.uploadModelFiles).toHaveBeenCalledWith(
      mutation, expression, { birthDate: '1990-01-02', gender: 'female', stage: '1' }, 'test-token',
    );
    await act(async () => { complete(result); });
    expect(screen.getByRole('heading', { name: '분석 결과 대시보드' })).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: '주요 메뉴' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '새 분석' }));
    expect(screen.getByLabelText('출생 연도')).toHaveValue('');
  });

  it('returns to the upload step with the message and selected files on failure', async () => {
    mocks.uploadModelFiles.mockRejectedValue(new ApiError(502, '분석 결과를 저장하지 못했습니다.'));
    const user = userEvent.setup();
    render(<App />);
    await fillAnalysis(user);
    await user.click(screen.getByRole('button', { name: '분석 실행' }));
    expect(await screen.findByText('분석 결과를 저장하지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByText('mutation.csv')).toBeInTheDocument();
    expect(screen.getByText('expression.csv')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '분석 실행' })).toBeEnabled();
  });

  it('opens a saved result, returns to the dashboard and signs out', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: '새 분석' });
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: '대시보드' }));
    expect(await screen.findByRole('heading', { name: '전체 환자 분석 결과' })).toBeInTheDocument();
    expect(mocks.fetchAnalysisResults).toHaveBeenCalledWith('test-token');
    await user.click(screen.getByRole('button', { name: /P-001/ }));
    expect(screen.getByRole('heading', { name: '분석 결과 대시보드' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '대시보드로' }));
    await screen.findByRole('heading', { name: '전체 환자 분석 결과' });
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
