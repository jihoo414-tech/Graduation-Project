import { useEffect } from 'react';
import type { BackendErrorDetail } from '../lib/types';

type ErrorAlertProps = {
  code: string;
  message: string;
  details?: BackendErrorDetail[];
  onDismiss: () => void;
};

export function ErrorAlert({ code, message, details = [], onDismiss }: ErrorAlertProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDismiss]);

  return (
    <div className="error-modal-backdrop" onClick={onDismiss}>
      <section
        className="error-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="upload-error-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="error-panel-header">
          <div className="error-dialog-heading">
            <h2 id="upload-error-title">요청 오류</h2>
            <p>{message}</p>
          </div>
        </div>

        <div className="error-code">오류 코드: {code}</div>

        {details.length > 0 ? (
          <ul className="detail-list">
            {details.map((detail, index) => (
              <li key={`${detail.field ?? 'detail'}-${detail.rule ?? 'rule'}-${index}`}>
                <strong>{detail.field ?? 'unknown field'}</strong>
                {detail.rule ? ` - ${detail.rule}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">서버가 필드별 상세 정보를 반환하지 않았습니다.</p>
        )}

        <div className="button-row">
          <button type="button" className="primary-button error-panel-close" onClick={onDismiss}>
            닫기
          </button>
        </div>
      </section>
    </div>
  );
}
