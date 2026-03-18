import type { BackendErrorDetail } from '../lib/types';

type ErrorAlertProps = {
  code: string;
  message: string;
  details?: BackendErrorDetail[];
};

export function ErrorAlert({ code, message, details = [] }: ErrorAlertProps) {
  return (
    <section className="panel error-panel" role="alert" aria-live="assertive">
      <div className="section-heading">
        <h2>Upload error</h2>
        <p>{message}</p>
      </div>

      <div className="error-code">Code: {code}</div>

      {details.length > 0 ? (
        <ul className="detail-list">
          {details.map((detail, index) => (
            <li key={`${detail.field ?? 'detail'}-${detail.rule ?? 'rule'}-${index}`}>
              <strong>{detail.field ?? 'unknown field'}</strong>
              {detail.rule ? ` · ${detail.rule}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-text">No field-level details were returned by the backend.</p>
      )}
    </section>
  );
}
