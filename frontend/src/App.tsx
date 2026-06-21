import { useState } from 'react';
import { ErrorAlert } from './components/ErrorAlert';
import { AnalyzingPage } from './components/product/AnalyzingPage';
import { AppSidebar } from './components/product/AppSidebar';
import { ResultPage } from './components/product/ResultPage';
import { normalizeUnknownError, uploadModelFiles } from './lib/api';
import type { ResultEnvelope } from './lib/types';

type Phase = 'dashboard' | 'input' | 'analyzing' | 'result';

export default function App() {
  const [phase, setPhase] = useState<Phase>('input');
  const [mutationFile, setMutationFile] = useState<File | null>(null);
  const [expressionFile, setExpressionFile] = useState<File | null>(null);
  const [inputStep, setInputStep] = useState<1 | 2>(1);
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [gender, setGender] = useState('');
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<ResultEnvelope | null>(null);
  const [error, setError] = useState<ReturnType<typeof normalizeUnknownError> | null>(null);

  const reset = () => {
    setPhase('input');
    setMutationFile(null);
    setExpressionFile(null);
    setInputStep(1);
    setBirthYear('');
    setBirthMonth('');
    setBirthDay('');
    setGender('');
    setStage('');
    setResult(null);
    setError(null);
  };

  const continueToFiles = () => {
    const numericBirthYear = Number(birthYear);
    const koreanAge = new Date().getFullYear() - numericBirthYear + 1;
    const birthDate = new Date(numericBirthYear, Number(birthMonth) - 1, Number(birthDay));
    const validDate = birthDate.getFullYear() === numericBirthYear && birthDate.getMonth() === Number(birthMonth) - 1 && birthDate.getDate() === Number(birthDay);
    if (!birthYear || !birthMonth || !birthDay || !validDate || birthDate > new Date() || koreanAge < 1 || koreanAge > 120 || !gender || !stage) {
      setError({ code: 'INVALID_CLINICAL_VALUE', message: '입력을 다시 확인해주세요.', details: [] });
      return;
    }
    setError(null);
    setInputStep(2);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mutationFile || !expressionFile) {
      setError({ code: 'FILE_REQUIRED', message: '돌연변이 CSV, RNA-seq CSV, 나이, 성별, 병기를 모두 입력해주세요.', details: [] });
      return;
    }
    try {
      setError(null);
      setPhase('analyzing');
      const response = await uploadModelFiles(mutationFile, expressionFile, { birthDate: `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`, gender, stage });
      setResult(response);
      setPhase('result');
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError));
      setPhase('input');
    }
  };

  if (phase === 'analyzing') return <AnalyzingPage />;
  if (phase === 'result' && result) return <ResultPage result={result} onBackToCases={reset} />;

  if (phase === 'dashboard') return <div className="authenticated-layout app-shell"><AppSidebar active="dashboard" onDashboard={() => setPhase('dashboard')} onStartAnalysis={() => setPhase('input')} /><main className="product-shell authenticated-content"><section className="workspace-page-shell"><p className="workspace-page-kicker">Dashboard</p><h1>LUAD 생존 위험 분석</h1><p>분석 메뉴에서 환자 임상정보와 두 개의 유전체 데이터를 입력하면 실제 앙상블 모델 결과를 확인할 수 있습니다.</p><button className="primary-button" type="button" onClick={() => setPhase('input')}>분석으로 이동</button></section></main></div>;

  return (
    <div className="authenticated-layout app-shell"><AppSidebar active="analysis" onDashboard={() => setPhase('dashboard')} onStartAnalysis={() => setPhase('input')} /><main className="product-shell authenticated-content">
      <section className="workspace-page-shell">
        <header className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">LUAD survival analysis</p>
            <h1>생존 위험 분석</h1>
            <p>돌연변이 유무와 RNA-seq 파일을 업로드하여 Cox·RSF·DeepSurv 앙상블 결과를 확인합니다.</p>
          </div>
        </header>
        <form className="upload-form" onSubmit={submit}>
          {inputStep === 1 ? <><div className="builder-form-grid">
            <label><span>생년월일</span><div className="birth-date-selects"><select aria-label="출생 연도" value={birthYear} onChange={(event) => setBirthYear(event.target.value)}><option value="">YYYY</option>{Array.from({ length: 120 }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}</select><select aria-label="출생 월" value={birthMonth} onChange={(event) => setBirthMonth(event.target.value)}><option value="">MM</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}</option>)}</select><select aria-label="출생 일" value={birthDay} onChange={(event) => setBirthDay(event.target.value)}><option value="">DD</option>{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}</select></div></label>
            <label><span>성별</span><select aria-label="성별" value={gender} onChange={(event) => setGender(event.target.value)}><option value="">선택</option><option value="female">여성</option><option value="male">남성</option></select></label>
            <label><span>암 병기</span><select aria-label="암 병기" value={stage} onChange={(event) => setStage(event.target.value)}><option value="">선택</option><option value="1">Stage 1</option><option value="2">Stage 2</option><option value="3">Stage 3</option><option value="4">Stage 4</option></select></label>
          </div>
          <button className="primary-button" type="button" onClick={continueToFiles}>다음</button></> : <>
          <div className="upload-page-grid">
            <label className="file-dropzone"><span>돌연변이 유무 CSV</span><input aria-label="돌연변이 유무 CSV" type="file" accept=".csv,text/csv" onChange={(event) => setMutationFile(event.target.files?.[0] ?? null)} />{mutationFile && <strong>{mutationFile.name}</strong>}</label>
            <label className="file-dropzone"><span>RNA-seq 발현량 CSV</span><input aria-label="RNA-seq 발현량 CSV" type="file" accept=".csv,text/csv" onChange={(event) => setExpressionFile(event.target.files?.[0] ?? null)} />{expressionFile && <strong>{expressionFile.name}</strong>}</label>
          </div>
          <p className="clinical-disclaimer">이 결과는 임상 의사결정 보조용 위험 예측 정보이며, 진단 또는 치료 결정을 대체하지 않습니다.</p>
          <button className="primary-button" type="submit">실제 모델 분석 실행</button>
          <button className="secondary-button" type="button" onClick={() => setInputStep(1)}>이전</button></>}
        </form>
      </section>
      {error && <ErrorAlert code={error.code} message={error.message} details={error.details} onDismiss={() => setError(null)} />}
    </main></div>
  );
}
