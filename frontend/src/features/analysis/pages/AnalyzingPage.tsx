export function AnalyzingPage() {
  return (
    <main className="product-shell">
      <section className="workspace-page-shell">
        <div className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Analyzing</p>
            <h1>분석 진행 중</h1>
            <p>입력 데이터를 바탕으로 모델 예측을 수행하고 있습니다.</p>
          </div>
        </div>

        <div className="analysis-loading-shell" role="status" aria-atomic="true" aria-busy="true">
          <div className="analysis-spinner" aria-hidden="true" />
          <strong>모델 예측 수행 중</strong>
          <p>입력 데이터를 정리하고 세 가지 생존분석 모델의 결과를 결합하고 있습니다.</p>
          <div className="analysis-progress" role="progressbar" aria-label="분석 진행 중" aria-valuetext="완료 시 자동으로 결과를 표시합니다.">
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}
