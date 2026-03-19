type AnalyzingPageProps = {
  steps: string[];
  activeIndex: number;
};

export function AnalyzingPage({ steps, activeIndex }: AnalyzingPageProps) {
  return (
    <main className="product-shell">
      <section className="workspace-page-shell">
        <div className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Analyzing</p>
            <h1>분석 진행 중</h1>
            <p>퍼센트보다 현재 어떤 작업을 수행 중인지 보여줘 의료진에게 더 높은 신뢰를 전달합니다.</p>
          </div>
        </div>

        <div className="analysis-step-list">
          {steps.map((step, index) => (
            <article
              key={step}
              className={`analysis-step-card ${
                index < activeIndex ? 'is-complete' : index === activeIndex ? 'is-active' : ''
              }`}
            >
              <strong>{index + 1}</strong>
              <div>
                <h2>{step}</h2>
                <p>
                  {index < activeIndex
                    ? '완료'
                    : index === activeIndex
                      ? '현재 처리 중'
                      : '대기 중'}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
