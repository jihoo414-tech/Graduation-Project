import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ContractPreview } from './components/ContractPreview';
import { ErrorAlert } from './components/ErrorAlert';
import { ResultView } from './components/ResultView';
import { acceptedFormats } from './lib/contracts';
import { API_BASE_URL, normalizeUnknownError, uploadPatientFile } from './lib/api';
import type { ResultEnvelope } from './lib/types';

type ViewState = 'idle' | 'loading' | 'success' | 'error';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [result, setResult] = useState<ResultEnvelope | null>(null);
  const [error, setError] = useState<ReturnType<typeof normalizeUnknownError> | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const assignSelectedFile = (file: File | null) => {
    setIsDragActive(false);
    setSelectedFile(file);
    if (viewState === 'error') {
      setViewState('idle');
      setError(null);
    }
  };

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) {
      return '아직 선택한 파일이 없습니다.';
    }

    return `${selectedFile.name} · ${Math.max(selectedFile.size / 1024, 0.1).toFixed(1)} KB`;
  }, [selectedFile]);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setError({
        code: 'FILE_REQUIRED',
        message: '업로드할 CSV 또는 JSON 파일을 먼저 선택해주세요.',
        details: [{ field: 'file', rule: 'required' }],
      });
      setViewState('error');
      setResult(null);
      return;
    }

    setViewState('loading');
    setError(null);
    setResult(null);

    try {
      const response = await uploadPatientFile(selectedFile);
      setResult(response);
      setViewState('success');
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError));
      setViewState('error');
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">졸업 프로젝트 프로토타입</p>
          <h1>LUAD 재발·생존 예측 업로드 화면</h1>
          <p className="hero-copy">
            환자 1명의 CSV 또는 JSON 파일을 업로드하면, 백엔드가 정규화한 뒤 안정적인 v1 추론 응답 형식으로 결과를 보여줍니다.
          </p>
        </div>
        <div className="hero-meta">
          <span>API 기본 주소</span>
          <strong>{API_BASE_URL}</strong>
        </div>
      </header>

      <main className="content">
        <section className="panel">
          <div className="section-heading">
            <h2>환자 파일 업로드</h2>
            <p>
              로컬 개발 환경에서는 <code>VITE_API_BASE_URL</code> 값으로 백엔드 주소를 바꿀 수 있습니다.
            </p>
          </div>

          <form className="upload-form" onSubmit={handleUpload}>
            <label
              className={`file-picker ${isDragActive ? 'drag-active' : ''}`}
              htmlFor="patient-file"
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget === event.target) {
                  setIsDragActive(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragActive(false);
                assignSelectedFile(event.dataTransfer.files?.[0] ?? null);
              }}
            >
              <span>CSV 또는 JSON 선택</span>
              <span className="drop-hint">또는 이 영역으로 파일을 끌어다 놓으세요.</span>
              <input
                id="patient-file"
                name="patient-file"
                type="file"
                accept=".csv,application/json,.json,text/csv"
                onChange={(event) => {
                  assignSelectedFile(event.target.files?.[0] ?? null);
                }}
              />
            </label>

            <div className="file-meta">
              <strong>선택한 파일</strong>
              <span>{selectedFileLabel}</span>
            </div>

            <button type="submit" className="primary-button" disabled={viewState === 'loading'}>
              {viewState === 'loading' ? '업로드 중…' : '업로드 후 추론 실행'}
            </button>
          </form>

          <div className="helper-grid">
            <article className="helper-card">
              <h3>업로드 형식 안내</h3>
              <ul className="detail-list">
                {acceptedFormats.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </article>

            <article className="helper-card">
              <h3>진행 단계</h3>
              <ol className="flow-list">
                <li className={viewState === 'idle' ? 'active' : ''}>업로드 대기</li>
                <li className={viewState === 'loading' ? 'active' : ''}>처리 중</li>
                <li className={viewState === 'success' ? 'active' : ''}>결과 확인</li>
                <li className={viewState === 'error' ? 'active' : ''}>오류 확인</li>
              </ol>
            </article>
          </div>
        </section>

        <ContractPreview />

        {viewState === 'loading' ? (
          <section className="panel loading-panel" aria-live="polite">
            <h2>업로드 처리 중</h2>
            <p>파일 업로드, 검증, 정규화, 어댑터 실행을 순서대로 진행하고 있습니다.</p>
          </section>
        ) : null}

        {viewState === 'error' && error ? (
          <ErrorAlert code={error.code} message={error.message} details={error.details} />
        ) : null}

        {viewState === 'success' && result ? <ResultView data={result} /> : null}
      </main>
    </div>
  );
}

export default App;
