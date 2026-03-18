import { useEffect, useMemo, useState } from 'react';
import { fetchContractExamples } from '../lib/api';
import { acceptedFormats } from '../lib/contracts';
import type { ContractExamplesResponse } from '../lib/types';

const downloadText = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function ContractPreview() {
  const [examples, setExamples] = useState<ContractExamplesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void fetchContractExamples()
      .then((payload) => {
        if (active) {
          setExamples(payload);
        }
      })
      .catch(() => {
        if (active) {
          setError('백엔드가 실행 중일 때 계약 예시를 불러올 수 있습니다.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const previews = useMemo(() => {
    if (!examples) {
      return [];
    }

    return [
      { title: 'CSV 예시', content: examples.csv_example },
      { title: 'JSON 예시', content: JSON.stringify(examples.json_example, null, 2) },
      {
        title: '결과 응답 예시',
        content: JSON.stringify(examples.envelope_example, null, 2),
      },
    ];
  }, [examples]);

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>계약 예시 미리보기</h2>
        <p>원본 예시는 백엔드 계약 엔드포인트에서 직접 불러옵니다.</p>
      </div>

      <div className="helper-card contract-helper">
        <h3>업로드 형식 안내</h3>
        <ul className="detail-list">
          {acceptedFormats.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </div>

      {error ? <p className="muted-text">{error}</p> : null}
      {!examples && !error ? <p className="muted-text">계약 예시를 불러오는 중입니다…</p> : null}

      {examples && previews.length > 0 ? (
        <>
          <div className="button-row">
            <button
              type="button"
              className="secondary-button"
              onClick={() => downloadText('patient-example.csv', examples.csv_example, 'text/csv')}
            >
              CSV 예시 다운로드
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                downloadText(
                  'patient-example.json',
                  JSON.stringify(examples.json_example, null, 2),
                  'application/json',
                )
              }
            >
              JSON 예시 다운로드
            </button>
          </div>

          <div className="preview-grid">
            {previews.map((preview) => (
              <article className="preview-card" key={preview.title}>
                <h3>{preview.title}</h3>
                <pre>{preview.content}</pre>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
