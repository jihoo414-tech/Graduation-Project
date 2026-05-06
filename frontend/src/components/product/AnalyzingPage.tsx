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

        <div className="analysis-loading-shell" role="status" aria-live="polite">
          <div className="analysis-gear" aria-hidden="true">
            ⚙
          </div>
          <strong>모델 예측 수행 중</strong>
          <p>잠시만 기다려주세요. 예측 결과를 준비하고 있습니다.</p>
        </div>
      </section>
    </main>
  );
}
