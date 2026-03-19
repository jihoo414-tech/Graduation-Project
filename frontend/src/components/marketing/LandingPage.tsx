import { useMemo, useState } from 'react';
import type { MouseEventHandler } from 'react';

type LandingPageProps = {
  onRequestDemo: MouseEventHandler<HTMLButtonElement>;
  onViewProduct: MouseEventHandler<HTMLButtonElement>;
};

type PreviewMode = 'intake' | 'analysis' | 'explanation';

const previewModes: Record<
  PreviewMode,
  {
    label: string;
    eyebrow: string;
    title: string;
    description: string;
    rail: string[];
    metrics: { label: string; value: string; tone?: 'quiet' | 'strong' }[];
    insights: string[];
    note: string;
  }
> = {
  intake: {
    label: 'Case intake',
    eyebrow: 'PAGE 01 · DATA INTAKE',
    title: '케이스 생성부터 입력 확인까지 한 흐름으로 정리합니다',
    description:
      '임상 정보, 유전체 결과, 업로드 규칙을 분리하지 않고 하나의 intake workspace로 보여줘 입력 자체의 피로를 낮춥니다.',
    rail: ['기본 정보 확인', '유전체 파일 업로드', '누락값 점검', '분석 준비 완료'],
    metrics: [
      { label: '필수 필드 검증', value: '03 passed', tone: 'strong' },
      { label: '주요 바이오마커', value: 'TP53 / EGFR' },
      { label: '업로드 상태', value: 'Ready for analysis' },
    ],
    insights: ['입력 오류를 분석 전에 차단', '케이스별 검토 메모를 같은 화면에 배치'],
    note: '1회 업로드 = 환자 1명 원칙과 비식별 규칙을 화면 구조 자체에 녹였습니다.',
  },
  analysis: {
    label: 'Risk review',
    eyebrow: 'PAGE 02 · ANALYSIS',
    title: '위험도, 근거, 검토 상태를 같은 시선 안에서 확인합니다',
    description:
      '의사가 가장 먼저 보는 위험도 카드와 기여 요인, 권장 검토 상태를 함께 묶어 결과 해석의 우선순위를 바로 잡습니다.',
    rail: ['재발 위험도', '주요 영향 요인', '시간 기반 예후', '권장 검토 상태'],
    metrics: [
      { label: 'Risk score', value: '0.62', tone: 'strong' },
      { label: 'Confidence', value: 'Structured review' },
      { label: 'Primary factor', value: 'TP53 mutation' },
    ],
    insights: ['결론 → 이유 → 주의문 순서 유지', '정량 지표와 설명 문장을 병렬 배치'],
    note: '모델 자체보다 의료진의 해석 부담을 줄이는 정보 계층을 중심에 뒀습니다.',
  },
  explanation: {
    label: 'Patient explanation',
    eyebrow: 'PAGE 03 · EXPLANATION',
    title: '전문의용 요약과 환자용 설명을 전환하며 상담 문장을 준비합니다',
    description:
      '과도하게 단정적이지 않은 문장을 유지하면서도 환자가 이해할 수 있는 수준으로 언어를 정리합니다.',
    rail: ['전문의용 요약', '환자용 설명', '불확실성 문장', '리포트 저장'],
    metrics: [
      { label: '상담용 문장', value: '3 ready', tone: 'strong' },
      { label: '복사 / 인쇄', value: 'One-click' },
      { label: '의료진 검토', value: 'Required' },
    ],
    insights: ['쉬운 언어와 주의문을 함께 제공', 'PDF/상담 메모 흐름까지 이어지는 마감 처리'],
    note: '환자에게 공포를 주지 않으면서도 정확성을 유지하는 톤을 별도 화면으로 다룹니다.',
  },
};

const featureRows = [
  {
    id: 'problems',
    eyebrow: 'Why clinicians stall',
    title: '설명하기 어려운 순간을 줄이는 화면 구조',
    body:
      '복잡한 유전체·임상 데이터를 의료진이 검토 가능한 단위로 다시 정렬해 상담 직전의 판단 부담을 낮춥니다.',
    items: ['유전체/임상 정보를 한 케이스 단위로 통합', '누락값과 입력 품질을 먼저 노출', '분석 시작 전 검토 포인트를 자동 정리'],
  },
  {
    id: 'solution',
    eyebrow: 'What the product does',
    title: '모델 결과를 “근거가 붙은 해석”으로 바꿉니다',
    body:
      '위험도 점수만 보여주는 대신, 왜 그런 결과가 나왔는지와 어떤 상태로 검토해야 하는지를 동시에 제시합니다.',
    items: ['위험도 카드 + 영향 요인 + 검토 상태를 한 화면에 배치', '시간 기반 예후와 상세 근거를 탭 구조로 정리', '의료진용 요약과 환자 설명용 문장 분리'],
  },
  {
    id: 'trust',
    eyebrow: 'How it lands in practice',
    title: '리포트와 설명자료까지 자연스럽게 이어집니다',
    body:
      '결과 검토 후 바로 환자 설명용 문장과 문서형 출력으로 이동해 실제 업무의 마지막 단계까지 마무리할 수 있습니다.',
    items: ['환자 설명용 / 전문의용 토글', 'PDF 저장과 문서형 리포트 레이아웃', '임상 판단 보조용 면책 구조 유지'],
  },
];

const productJourney = [
  {
    label: 'Landing',
    title: '문제 해결 메시지 중심의 첫 화면',
    description: 'AI 모델이 아니라 의사의 해석 부담을 줄인다는 메시지를 전면에 둡니다.',
  },
  {
    label: 'Case setup',
    title: '새 케이스 생성 / 데이터 입력',
    description: '긴 폼 대신 단계형 입력과 검토 가능한 보조 패널을 배치합니다.',
  },
  {
    label: 'Result',
    title: '결과 대시보드와 해석 워크스페이스',
    description: '위험도, 근거, 설명, 내보내기까지 한 흐름 안에 정리합니다.',
  },
  {
    label: 'Report',
    title: '설명자료와 출력 문서 마감',
    description: '상담용 문장, PDF 저장, 문서형 레이아웃으로 마지막 업무를 마무리합니다.',
  },
];

const trustItems = [
  '의료진 workflow 중심의 정보 계층',
  '임상 데이터 기반 결과 해석 구조',
  '비식별·보조용 원칙을 전제로 한 화면 카피',
  '리포트와 환자 설명 단계까지 이어지는 end-to-end 흐름',
];

export function LandingPage({ onRequestDemo, onViewProduct }: LandingPageProps) {
  const [activePreview, setActivePreview] = useState<PreviewMode>('analysis');
  const activePanel = useMemo(() => previewModes[activePreview], [activePreview]);

  return (
    <main className="marketing-shell interfere-marketing-shell">
      <section className="reference-nav-shell">
        <div className="reference-brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="reference-brand-copy">
          <p className="marketing-kicker">Medical Explain AI</p>
          <strong>Clinical interpretation workspace</strong>
        </div>

        <nav className="reference-nav-links" aria-label="랜딩 섹션">
          <a href="#why">Why</a>
          <a href="#workflow">Workflow</a>
          <a href="#preview">Preview</a>
          <a href="#trust">Trust</a>
        </nav>

        <div className="reference-nav-actions">
          <button type="button" className="secondary-button" onClick={onViewProduct}>
            제품 화면 보기
          </button>
          <button type="button" className="primary-button" onClick={onRequestDemo}>
            데모 요청
          </button>
        </div>
      </section>

      <section className="reference-hero-shell">
        <div className="reference-hero-copy">
          <p className="marketing-kicker">Medical interpretation software</p>
          <h1>
            암 진단 결과 해석을 더 빠르고{' '}
            <span className="reference-accent-word">명확하게</span>
          </h1>
          <p>
            환자 유전체 및 임상 데이터를 기반으로 재발 위험을 분석하고, 의사가 이해하기 쉬운 해석과
            환자 설명용 요약까지 제공합니다.
          </p>

          <div className="button-row">
            <button type="button" className="primary-button" onClick={onRequestDemo}>
              데모 요청
            </button>
            <button type="button" className="secondary-button" onClick={onViewProduct}>
              제품 화면 보기
            </button>
          </div>

          <div className="reference-proof-row">
            <div className="reference-proof-card">
              <span>Clinical workflow</span>
              <strong>결과 해석 → 설명 → 리포트</strong>
            </div>
            <div className="reference-proof-card">
              <span>Safety note</span>
              <strong>의사 판단 보조용</strong>
            </div>
            <div className="reference-proof-card">
              <span>Demo</span>
              <strong>end-to-end flow ready</strong>
            </div>
          </div>
        </div>

        <div className="reference-hero-aside">
          <p className="marketing-kicker">A calmer product frame</p>
          <h2>기술 자랑보다 해석 부담을 줄여주는 구조를 먼저 보여줍니다</h2>
          <p>
            interfere.com의 공기감 있는 타이포그래피, 얇은 보더, soft shell, product-first mockup 구성을
            의료 워크플로우에 맞게 재해석했습니다.
          </p>
          <ul className="detail-list reference-aside-list">
            <li>모노 라벨과 넓은 여백으로 정보 계층 분리</li>
            <li>얇은 경계선, 부드러운 그림자, 검은 primary CTA</li>
            <li>hero와 footer에 반복되는 gradient glow</li>
          </ul>
        </div>
      </section>

      <section className="reference-stage-shell" id="workflow">
        <div className="reference-stage-header">
          <div>
            <p className="marketing-kicker">Product mockup</p>
            <h2>실제 제품 UI 목업을 중심으로 흐름을 보여줍니다</h2>
          </div>
          <div className="reference-mode-switch" role="tablist" aria-label="제품 미리보기 모드">
            {(Object.keys(previewModes) as PreviewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={activePreview === mode}
                className={`reference-mode-pill ${activePreview === mode ? 'is-active' : ''}`}
                onClick={() => setActivePreview(mode)}
              >
                {previewModes[mode].label}
              </button>
            ))}
          </div>
        </div>

        <div className="reference-stage-grid">
          <aside className="reference-stage-rail">
            <p className="marketing-kicker">{activePanel.eyebrow}</p>
            <h3>{activePanel.title}</h3>
            <p>{activePanel.description}</p>
            <div className="reference-rail-list">
              {activePanel.rail.map((item, index) => (
                <div key={item} className="reference-rail-item">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </aside>

          <div className="reference-stage-main">
            <div className="reference-stage-window">
              <div className="reference-stage-banner">
                <div className="reference-stage-banner-copy">
                  <span>Clinical workspace</span>
                  <strong>{activePanel.label}</strong>
                </div>
                <div className="reference-stage-badges" aria-hidden="true">
                  <span>Care flow</span>
                  <span>{activePreview === 'analysis' ? 'Risk review' : activePreview === 'intake' ? 'Intake' : 'Explanation'}</span>
                </div>
              </div>

              <div className="reference-window-body">
                <div className="reference-window-summary">
                  {activePanel.metrics.map((metric) => (
                    <article
                      key={metric.label}
                      className={`reference-metric-card ${metric.tone === 'strong' ? 'is-strong' : ''}`}
                    >
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </article>
                  ))}
                </div>

                <div className="reference-chart-shell" aria-hidden="true">
                  <div className="reference-chart-copy">
                    <span>CASE SUMMARY</span>
                    <strong>{activePreview === 'analysis' ? '중간 위험군 / review recommended' : 'structured workspace'}</strong>
                    <p>{activePanel.note}</p>
                  </div>
                  <div className="reference-chart-visual">
                    <div className="reference-chart-line reference-line-a" />
                    <div className="reference-chart-line reference-line-b" />
                    <div className="reference-chart-bars">
                      <span style={{ height: '36%' }} />
                      <span style={{ height: '58%' }} />
                      <span style={{ height: '76%' }} />
                      <span style={{ height: '52%' }} />
                      <span style={{ height: '84%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="reference-stage-side">
            <article className="reference-detail-card">
              <p className="marketing-kicker">Key takeaways</p>
              <ul className="detail-list">
                {activePanel.insights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="reference-detail-card reference-detail-emphasis">
              <p className="marketing-kicker">Why this matters</p>
              <strong>의료진이 “어떻게 읽고 어떻게 설명할지”까지 이어지는 제품 구조</strong>
              <p>{activePanel.note}</p>
            </article>
          </aside>
        </div>
      </section>

      <section className="marketing-section reference-story-section" id="why">
        <div className="reference-story-grid">
          {featureRows.map((row, index) => (
            <article key={row.id} className="reference-story-card">
              <div>
                <p className="marketing-kicker">{row.eyebrow}</p>
                <h3>{row.title}</h3>
                <p>{row.body}</p>
              </div>
              <ul className="detail-list">
                {row.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="reference-story-visual" aria-hidden="true">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{row.id === 'problems' ? 'Intake workspace' : row.id === 'solution' ? 'Analysis board' : 'Explanation output'}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section reference-preview-section" id="preview">
        <div className="section-heading">
          <p className="marketing-kicker">Product journey</p>
          <h2>랜딩부터 결과 설명까지 이어지는 화면 흐름</h2>
        </div>

        <div className="reference-preview-grid">
          {productJourney.map((entry) => (
            <article key={entry.label} className="reference-preview-card">
              <span>{entry.label}</span>
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
              <div className="reference-preview-arrow" aria-hidden="true">
                ↗
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section reference-trust-section" id="trust">
        <div className="section-heading">
          <p className="marketing-kicker">Trust</p>
          <h2>의료 SaaS에 필요한 차분한 신뢰 구조를 유지합니다</h2>
        </div>

        <div className="reference-trust-grid">
          {trustItems.map((item) => (
            <article key={item} className="reference-trust-card">
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="reference-footer-cta">
        <div>
          <p className="marketing-kicker">Next step</p>
          <h2>
            환자 설명까지 이어지는 해석 워크플로우를{' '}
            <span className="reference-accent-word">직접 확인해보세요</span>
          </h2>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onViewProduct}>
            제품 화면 보기
          </button>
          <button type="button" className="primary-button" onClick={onRequestDemo}>
            데모 요청
          </button>
        </div>
      </section>
    </main>
  );
}
