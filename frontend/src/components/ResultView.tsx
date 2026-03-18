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

const clinicalLabelMap: Record<string, string> = {
  age: '나이',
  pathologic_stage: '병리학적 병기',
  gender: '성별',
};

export function ResultView({ data }: ResultViewProps) {
  const clinical = data.normalized_input.clinical;
  const clinicalEntries = [
    { key: 'age', value: clinical.age },
    { key: 'pathologic_stage', value: clinical.pathologic_stage },
    { key: 'gender', value: clinical.gender },
  ].filter((entry) => entry.value !== undefined);
  const warnings = data.warnings;
  const artifacts = data.result.artifacts;

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>추론 결과</h2>
        <p>정규화된 입력과 어댑터 출력을 안정적인 v1 형식으로 보여줍니다.</p>
      </div>

      <div className="result-grid">
        <article className="result-card">
          <h3>비식별 환자 요약</h3>
          <dl className="summary-list">
            <div>
              <dt>환자 ID</dt>
              <dd>{data.patient.deidentified_patient_id}</dd>
            </div>
            <div>
              <dt>결과 버전</dt>
              <dd>{data.result_version}</dd>
            </div>
            <div>
              <dt>어댑터</dt>
              <dd>{data.result.adapter}</dd>
            </div>
            <div>
              <dt>위험도 등급</dt>
              <dd>{data.result.summary.risk_level}</dd>
            </div>
            <div>
              <dt>위험 점수</dt>
              <dd>{data.result.summary.risk_score}</dd>
            </div>
          </dl>
        </article>

        <article className="result-card">
          <h3>결과 요약</h3>
          <p>{data.result.summary.text}</p>
          {warnings.length > 0 ? (
            <>
              <h4>주의 사항</h4>
              <ul className="detail-list">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted-text">반환된 주의 사항이 없습니다.</p>
          )}
        </article>
      </div>

      <article className="result-card">
        <h3>정규화된 변이 테이블</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>유전자</th>
                <th>변이 분류</th>
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
          <h3>임상 정보</h3>
          <dl className="summary-list">
            {clinicalEntries.map((entry) => (
              <div key={entry.key}>
                <dt>{clinicalLabelMap[entry.key] ?? entry.key}</dt>
                <dd>{formatValue(entry.value)}</dd>
              </div>
            ))}
          </dl>
        </article>
      ) : null}

      <article className="result-card">
        <h3>어댑터 정보</h3>
        <dl className="summary-list">
          <div>
            <dt>어댑터 이름</dt>
            <dd>{data.result.adapter}</dd>
          </div>
          <div>
            <dt>아티팩트 항목</dt>
            <dd>{Object.keys(artifacts).length > 0 ? Object.keys(artifacts).join(', ') : '없음'}</dd>
          </div>
        </dl>
      </article>

      <article className="result-card artifact-placeholder">
        <h3>확장 결과 영역</h3>
        <p>앞으로 생존 곡선이나 모델 설명 같은 추가 결과가 들어와도 현재 업로드 흐름을 바꾸지 않고 이 영역에 표시할 수 있습니다.</p>
        <div className="artifact-grid">
          <div>
            <h4>생존 곡선</h4>
            {artifacts.survival_curve ? (
              <>
                <p>{artifacts.survival_curve.label}</p>
                <p className="muted-text">{artifacts.survival_curve.points.length}개의 포인트가 전달되었습니다.</p>
              </>
            ) : (
              <p className="muted-text">아직 생존 곡선이 반환되지 않았습니다.</p>
            )}
          </div>
          <div>
            <h4>설명 결과</h4>
            {artifacts.explanations.length > 0 ? (
              <ul className="detail-list">
                {artifacts.explanations.map((item) => (
                  <li key={`${item.title}-${item.detail}`}>
                    <strong>{item.title}</strong> · {item.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">아직 설명 결과가 없습니다.</p>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
