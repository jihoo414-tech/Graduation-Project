import { useState } from 'react';
import { ErrorAlert } from './components/ErrorAlert';
import { AnalyzingPage } from './components/product/AnalyzingPage';
import { AppSidebar } from './components/product/AppSidebar';
import { ResultPage } from './components/product/ResultPage';
import { normalizeUnknownError, uploadModelFiles } from './lib/api';
import type { ResultEnvelope } from './lib/types';

type Phase = 'landing' | 'input' | 'analyzing' | 'result';

export default function App() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [mutationFile, setMutationFile] = useState<File | null>(null);
  const [expressionFile, setExpressionFile] = useState<File | null>(null);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('female');
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<ResultEnvelope | null>(null);
  const [error, setError] = useState<ReturnType<typeof normalizeUnknownError> | null>(null);

  const reset = () => {
    setPhase('landing');
    setMutationFile(null);
    setExpressionFile(null);
    setAge('');
    setGender('female');
    setStage('');
    setResult(null);
    setError(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mutationFile || !expressionFile || !age || !stage) {
      setError({ code: 'FILE_REQUIRED', message: '돌연변이 CSV, RNA-seq CSV, 나이, 성별, 병기를 모두 입력해주세요.', details: [] });
      return;
    }
    try {
      setError(null);
      setPhase('analyzing');
      const response = await uploadModelFiles(mutationFile, expressionFile, { age, gender, stage });
      setResult(response);
      setPhase('result');
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError));
      setPhase('input');
    }
  };

  if (phase === 'analyzing') return <AnalyzingPage />;
  if (phase === 'result' && result) return <ResultPage result={result} onBackToCases={reset} />;

  if (phase === 'landing') return <main className="product-shell app-shell landing-page"><section className="workspace-page-shell"><p className="workspace-page-kicker">LUAD survival analysis</p><h1>폐선암 생존 위험 분석</h1><p>돌연변이 유무와 RNA-seq 데이터를 바탕으로 Cox, RSF, DeepSurv 앙상블 결과를 제공합니다.</p><button className="primary-button" type="button" onClick={() => setPhase('input')}>분석 시작</button></section></main>;

  return (
    <div className="authenticated-layout app-shell"><AppSidebar onHome={reset} onStartAnalysis={() => setPhase('input')} /><main className="product-shell authenticated-content">
      <section className="workspace-page-shell">
        <header className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">LUAD survival analysis</p>
            <h1>생존 위험 분석</h1>
            <p>돌연변이 유무와 RNA-seq 파일을 업로드하여 Cox·RSF·DeepSurv 앙상블 결과를 확인합니다.</p>
          </div>
        </header>
        <form className="upload-form" onSubmit={submit}>
          <div className="builder-form-grid">
            <label><span>나이</span><input aria-label="나이" type="number" min="0" max="130" value={age} onChange={(event) => setAge(event.target.value)} /></label>
            <label><span>성별</span><select aria-label="성별" value={gender} onChange={(event) => setGender(event.target.value)}><option value="female">여성</option><option value="male">남성</option></select></label>
            <label><span>암 병기</span><select aria-label="암 병기" value={stage} onChange={(event) => setStage(event.target.value)}><option value="">선택</option><option value="1">Stage 1</option><option value="2">Stage 2</option><option value="3">Stage 3</option><option value="4">Stage 4</option></select></label>
          </div>
          <div className="upload-page-grid">
            <label className="file-dropzone"><span>돌연변이 유무 CSV</span><input aria-label="돌연변이 유무 CSV" type="file" accept=".csv,text/csv" onChange={(event) => setMutationFile(event.target.files?.[0] ?? null)} />{mutationFile && <strong>{mutationFile.name}</strong>}</label>
            <label className="file-dropzone"><span>RNA-seq 발현량 CSV</span><input aria-label="RNA-seq 발현량 CSV" type="file" accept=".csv,text/csv" onChange={(event) => setExpressionFile(event.target.files?.[0] ?? null)} />{expressionFile && <strong>{expressionFile.name}</strong>}</label>
          </div>
          <p className="clinical-disclaimer">이 결과는 임상 의사결정 보조용 위험 예측 정보이며, 진단 또는 치료 결정을 대체하지 않습니다.</p>
          <button className="primary-button" type="submit">실제 모델 분석 실행</button>
        </form>
      </section>
      {error && <ErrorAlert code={error.code} message={error.message} details={error.details} onDismiss={() => setError(null)} />}
    </main></div>
  );
}
