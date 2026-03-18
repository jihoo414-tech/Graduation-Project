import { useEffect, useMemo, useState } from 'react';
import { fetchContractExamples } from '../lib/api';
import { acceptedFormats } from '../lib/contracts';
import type { ContractExamplesResponse } from '../lib/types';

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
          setError('Contract preview is unavailable until the backend is running.');
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
      { title: 'CSV example', content: examples.csv_example },
      { title: 'JSON example', content: JSON.stringify(examples.json_example, null, 2) },
      {
        title: 'Result envelope preview',
        content: JSON.stringify(examples.envelope_example, null, 2),
      },
    ];
  }, [examples]);

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Sample contract preview</h2>
        <p>Source-of-truth examples are loaded from the backend contract endpoint.</p>
      </div>

      <div className="helper-card contract-helper">
        <h3>Accepted format helper</h3>
        <ul className="detail-list">
          {acceptedFormats.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </div>

      {error ? <p className="muted-text">{error}</p> : null}
      {!examples && !error ? <p className="muted-text">Loading contract examples…</p> : null}

      {previews.length > 0 ? (
        <div className="preview-grid">
          {previews.map((preview) => (
            <article className="preview-card" key={preview.title}>
              <h3>{preview.title}</h3>
              <pre>{preview.content}</pre>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
