import type { ResultEnvelope } from '../lib/types';

type ResultViewProps = {
  data: ResultEnvelope;
};

const formatValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
};

export function ResultView({ data }: ResultViewProps) {
  const clinical = data.normalized_input.clinical;
  const clinicalEntries = [
    ['age', clinical.age],
    ['pathologic_stage', clinical.pathologic_stage],
    ['gender', clinical.gender],
  ].filter(([, value]) => value !== undefined);
  const warnings = data.warnings;
  const artifacts = data.result.artifacts;

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Inference result</h2>
        <p>Stable v1 envelope for normalized patient input and adapter output.</p>
      </div>

      <div className="result-grid">
        <article className="result-card">
          <h3>Deidentified patient summary</h3>
          <dl className="summary-list">
            <div>
              <dt>Patient ID</dt>
              <dd>{data.patient.deidentified_patient_id}</dd>
            </div>
            <div>
              <dt>Result version</dt>
              <dd>{data.result_version}</dd>
            </div>
            <div>
              <dt>Adapter</dt>
              <dd>{data.result.adapter}</dd>
            </div>
            <div>
              <dt>Risk level</dt>
              <dd>{data.result.summary.risk_level}</dd>
            </div>
            <div>
              <dt>Risk score</dt>
              <dd>{data.result.summary.risk_score}</dd>
            </div>
          </dl>
        </article>

        <article className="result-card">
          <h3>Result summary</h3>
          <p>{data.result.summary.text}</p>
          {warnings.length > 0 ? (
            <>
              <h4>Warnings</h4>
              <ul className="detail-list">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted-text">No warnings returned.</p>
          )}
        </article>
      </div>

      <article className="result-card">
        <h3>Normalized variant table</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Gene</th>
                <th>Variant classification</th>
              </tr>
            </thead>
            <tbody>
              {data.normalized_input.gene_variants.map((variant, index) => (
                <tr key={`${variant.gene}-${variant.variant_classification}-${index}`}>
                  <td>{variant.gene}</td>
                  <td>{variant.variant_classification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {clinicalEntries.length > 0 ? (
        <article className="result-card">
          <h3>Clinical section</h3>
          <dl className="summary-list">
            {clinicalEntries.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </article>
      ) : null}

      <article className="result-card">
        <h3>Adapter provenance</h3>
        <dl className="summary-list">
          <div>
            <dt>Adapter name</dt>
            <dd>{data.result.adapter}</dd>
          </div>
          <div>
            <dt>Artifact keys</dt>
            <dd>{Object.keys(artifacts).length > 0 ? Object.keys(artifacts).join(', ') : 'none'}</dd>
          </div>
        </dl>
      </article>

      <article className="result-card artifact-placeholder">
        <h3>Reserved artifact area</h3>
        <p>Future outputs such as survival curves and model explanations can render here without changing the upload flow.</p>
        <div className="artifact-grid">
          <div>
            <h4>Survival curve</h4>
            {artifacts.survival_curve ? (
              <>
                <p>{artifacts.survival_curve.label}</p>
                <p className="muted-text">{artifacts.survival_curve.points.length} plotted points received.</p>
              </>
            ) : (
              <p className="muted-text">No survival curve returned yet.</p>
            )}
          </div>
          <div>
            <h4>Explanations</h4>
            {artifacts.explanations.length > 0 ? (
              <ul className="detail-list">
                {artifacts.explanations.map((item) => (
                  <li key={`${item.title}-${item.detail}`}>
                    <strong>{item.title}</strong> · {item.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">No explanations returned yet.</p>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
