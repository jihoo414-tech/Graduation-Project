import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthPage } from './components/AuthPage';
import { ErrorAlert } from './components/ErrorAlert';
import { AnalyzingPage } from './components/product/AnalyzingPage';
import { AnalysisListPage } from './components/product/AnalysisListPage';
import { AppSidebar } from './components/product/AppSidebar';
import { ResultPage } from './components/product/ResultPage';
import { normalizeUnknownError, uploadModelFiles } from './lib/api';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type { ResultEnvelope } from './lib/types';

type Phase = 'dashboard' | 'list' | 'input' | 'analyzing' | 'result';
type ResultBackTarget = 'analysis' | 'list';

const currentYear = new Date().getFullYear();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
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
  const [resultBackTarget, setResultBackTarget] = useState<ResultBackTarget>('analysis');
  const [error, setError] = useState<ReturnType<typeof normalizeUnknownError> | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const resetAnalysis = () => {
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
    setResultBackTarget('analysis');
    setError(null);
  };

  const showDashboard = () => {
    setPhase('dashboard');
    setError(null);
  };

  const showList = () => {
    setPhase('list');
    setError(null);
  };

  const openSavedResult = (savedResult: ResultEnvelope) => {
    setResult(savedResult);
    setResultBackTarget('list');
    setError(null);
    setPhase('result');
  };

  const continueToFiles = () => {
    const numericBirthYear = Number(birthYear);
    const numericBirthMonth = Number(birthMonth);
    const numericBirthDay = Number(birthDay);
    const koreanAge = currentYear - numericBirthYear + 1;
    const birthDate = new Date(numericBirthYear, numericBirthMonth - 1, numericBirthDay);
    const validDate =
      birthDate.getFullYear() === numericBirthYear &&
      birthDate.getMonth() === numericBirthMonth - 1 &&
      birthDate.getDate() === numericBirthDay;

    if (
      !birthYear ||
      !birthMonth ||
      !birthDay ||
      !validDate ||
      birthDate > new Date() ||
      koreanAge < 1 ||
      koreanAge > 120 ||
      !gender ||
      !stage
    ) {
      setError({ code: 'INVALID_CLINICAL_VALUE', message: '입력값을 다시 확인해 주세요.', details: [] });
      return;
    }

    setError(null);
    setInputStep(2);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) {
      setError({ code: 'AUTH_REQUIRED', message: '분석 결과 저장을 위해 먼저 로그인해 주세요.', details: [] });
      return;
    }
    if (!mutationFile || !expressionFile) {
      setError({ code: 'FILE_REQUIRED', message: '돌연변이 CSV와 RNA-seq CSV를 모두 선택해 주세요.', details: [] });
      return;
    }

    try {
      setError(null);
      setPhase('analyzing');
      const response = await uploadModelFiles(
        mutationFile,
        expressionFile,
        {
          birthDate: `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`,
          gender,
          stage,
        },
        session.access_token,
      );
      setResult(response);
      setResultBackTarget('analysis');
      setPhase('result');
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError));
      setPhase('input');
    }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setSession(null);
    resetAnalysis();
  };

  if (!isSupabaseConfigured) {
    return (
      <main className="app-shell auth-shell">
        <section className="workspace-page-shell auth-panel">
          <p className="workspace-page-kicker">Supabase setup</p>
          <h1>Supabase 연결값이 필요합니다</h1>
          <p>
            `frontend/.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정하면
            계정 생성과 로그인 기능이 활성화됩니다.
          </p>
        </section>
      </main>
    );
  }

  if (authLoading) {
    return <AnalyzingPage />;
  }

  if (!session) {
    return <AuthPage />;
  }

  if (phase === 'analyzing') return <AnalyzingPage />;

  if (phase === 'result' && result) {
    return (
      <div className="authenticated-layout app-shell">
        <AppSidebar
          active={resultBackTarget === 'list' ? 'list' : 'dashboard'}
          userEmail={session.user.email}
          onDashboard={showDashboard}
          onList={showList}
          onStartAnalysis={resetAnalysis}
          onSignOut={signOut}
        />
        <ResultPage
          result={result}
          onBackToCases={resultBackTarget === 'list' ? showList : resetAnalysis}
          backButtonLabel={resultBackTarget === 'list' ? '목록으로' : '새 분석'}
        />
      </div>
    );
  }

  if (phase === 'list') {
    return (
      <div className="authenticated-layout app-shell">
        <AppSidebar
          active="list"
          userEmail={session.user.email}
          onDashboard={showDashboard}
          onList={showList}
          onStartAnalysis={resetAnalysis}
          onSignOut={signOut}
        />
        <AnalysisListPage onOpenResult={openSavedResult} onStartAnalysis={resetAnalysis} />
      </div>
    );
  }

  if (phase === 'dashboard') {
    return (
      <div className="authenticated-layout app-shell">
        <AppSidebar
          active="dashboard"
          userEmail={session.user.email}
          onDashboard={showDashboard}
          onList={showList}
          onStartAnalysis={resetAnalysis}
          onSignOut={signOut}
        />
        <main className="product-shell authenticated-content">
          <section className="workspace-page-shell">
            <p className="workspace-page-kicker">Dashboard</p>
            <h1>LUAD 생존 위험 분석</h1>
            <p>새 분석을 실행하면 결과가 Supabase 데이터베이스에 자동으로 저장됩니다.</p>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={resetAnalysis}>
                분석 시작
              </button>
              <button className="secondary-button" type="button" onClick={showList}>
                목록 보기
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="authenticated-layout app-shell">
      <AppSidebar
        active="analysis"
        userEmail={session.user.email}
        onDashboard={showDashboard}
        onList={showList}
        onStartAnalysis={resetAnalysis}
        onSignOut={signOut}
      />
      <main className="product-shell authenticated-content analysis-page">
        <section className="workspace-page-shell analysis-page-shell">
          <header className="workspace-page-header">
            <div>
              <p className="workspace-page-kicker">Analysis</p>
              <h1>새 분석</h1>
              <p>임상 정보와 CSV 파일을 입력하면 Cox, RSF, DeepSurv 앙상블 결과를 계산하고 저장합니다.</p>
            </div>
          </header>

          <form className="upload-form" onSubmit={submit}>
            {inputStep === 1 ? (
              <>
                <div className="analysis-step-banner">
                  <span>01</span>
                  <div>
                    <strong>환자 임상 정보</strong>
                    <p>생년월일, 성별, 병기를 먼저 입력해 모델 입력값을 구성합니다.</p>
                  </div>
                </div>
                <div className="builder-form-grid">
                  <label>
                    <span>생년월일</span>
                    <div className="birth-date-selects">
                      <select aria-label="출생 연도" value={birthYear} onChange={(event) => setBirthYear(event.target.value)}>
                        <option value="">YYYY</option>
                        {Array.from({ length: 120 }, (_, index) => currentYear - index).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <select aria-label="출생 월" value={birthMonth} onChange={(event) => setBirthMonth(event.target.value)}>
                        <option value="">MM</option>
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                      <select aria-label="출생 일" value={birthDay} onChange={(event) => setBirthDay(event.target.value)}>
                        <option value="">DD</option>
                        {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                  <label>
                    <span>성별</span>
                    <select aria-label="성별" value={gender} onChange={(event) => setGender(event.target.value)}>
                      <option value="">선택</option>
                      <option value="female">여성</option>
                      <option value="male">남성</option>
                    </select>
                  </label>
                  <label>
                    <span>병기</span>
                    <select aria-label="병기" value={stage} onChange={(event) => setStage(event.target.value)}>
                      <option value="">선택</option>
                      <option value="1">Stage 1</option>
                      <option value="2">Stage 2</option>
                      <option value="3">Stage 3</option>
                      <option value="4">Stage 4</option>
                    </select>
                  </label>
                </div>
                <div className="button-row analysis-actions">
                  <button className="primary-button" type="button" onClick={continueToFiles}>
                    다음 단계
                  </button>
                  <button className="secondary-button" type="button" onClick={showList}>
                    목록 보기
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="analysis-step-banner">
                  <span>02</span>
                  <div>
                    <strong>분석 파일 업로드</strong>
                    <p>돌연변이 CSV와 RNA-seq CSV를 업로드하면 모델 분석을 실행합니다.</p>
                  </div>
                </div>
                <div className="upload-page-grid">
                  <label className="file-dropzone">
                    <span>돌연변이 유전자 CSV</span>
                    <input
                      aria-label="돌연변이 유전자 CSV"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => setMutationFile(event.target.files?.[0] ?? null)}
                    />
                    {mutationFile && <strong>{mutationFile.name}</strong>}
                  </label>
                  <label className="file-dropzone">
                    <span>RNA-seq 발현량 CSV</span>
                    <input
                      aria-label="RNA-seq 발현량 CSV"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => setExpressionFile(event.target.files?.[0] ?? null)}
                    />
                    {expressionFile && <strong>{expressionFile.name}</strong>}
                  </label>
                </div>
                <p className="clinical-disclaimer">
                  이 결과는 임상 의사결정 보조용 위험 예측 정보이며, 진단 또는 치료 결정을 대체하지 않습니다.
                </p>
                <div className="button-row">
                  <button className="primary-button" type="submit">
                    분석 실행
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setInputStep(1)}>
                    이전
                  </button>
                </div>
              </>
            )}
          </form>
        </section>
        {error && <ErrorAlert code={error.code} message={error.message} details={error.details} onDismiss={() => setError(null)} />}
      </main>
    </div>
  );
}
