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

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) {
      return 'No file selected yet.';
    }

    return `${selectedFile.name} · ${Math.max(selectedFile.size / 1024, 0.1).toFixed(1)} KB`;
  }, [selectedFile]);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setError({
        code: 'FILE_REQUIRED',
        message: 'Choose a CSV or JSON file before submitting.',
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
          <p className="eyebrow">Graduation Project Prototype</p>
          <h1>LUAD recurrence / survival upload lane</h1>
          <p className="hero-copy">
            Upload a single-patient CSV or JSON file, let the backend normalize it, and review the stable v1
            inference envelope.
          </p>
        </div>
        <div className="hero-meta">
          <span>API base URL</span>
          <strong>{API_BASE_URL}</strong>
        </div>
      </header>

      <main className="content">
        <section className="panel">
          <div className="section-heading">
            <h2>Upload patient file</h2>
            <p>Supported for local development via configurable <code>VITE_API_BASE_URL</code>.</p>
          </div>

          <form className="upload-form" onSubmit={handleUpload}>
            <label className="file-picker" htmlFor="patient-file">
              <span>Select CSV or JSON</span>
              <input
                id="patient-file"
                name="patient-file"
                type="file"
                accept=".csv,application/json,.json,text/csv"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  if (viewState === 'error') {
                    setViewState('idle');
                    setError(null);
                  }
                }}
              />
            </label>

            <div className="file-meta">
              <strong>Selected</strong>
              <span>{selectedFileLabel}</span>
            </div>

            <button type="submit" className="primary-button" disabled={viewState === 'loading'}>
              {viewState === 'loading' ? 'Uploading…' : 'Upload and run inference'}
            </button>
          </form>

          <div className="helper-grid">
            <article className="helper-card">
              <h3>Accepted format helper</h3>
              <ul className="detail-list">
                {acceptedFormats.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </article>

            <article className="helper-card">
              <h3>Flow states</h3>
              <ol className="flow-list">
                <li className={viewState === 'idle' ? 'active' : ''}>Upload ready</li>
                <li className={viewState === 'loading' ? 'active' : ''}>Loading</li>
                <li className={viewState === 'success' ? 'active' : ''}>Result</li>
                <li className={viewState === 'error' ? 'active' : ''}>Error</li>
              </ol>
            </article>
          </div>
        </section>

        <ContractPreview />

        {viewState === 'loading' ? (
          <section className="panel loading-panel" aria-live="polite">
            <h2>Processing upload</h2>
            <p>Uploading, validating, normalizing, and running the configured adapter.</p>
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
