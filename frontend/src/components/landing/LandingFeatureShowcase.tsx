import { useMemo, useState } from 'react';

type FeatureItem = {
  title: string;
  description: string;
};

type LandingFeatureShowcaseProps = {
  label: string;
  title: string;
  subtitle: string;
  features: FeatureItem[];
};

type TabId = 'interpretation' | 'summary' | 'review';

type ChartDatum = {
  month: string;
  score: number;
  bars: [number, number, number];
};

const tabs: Array<{
  id: TabId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    id: 'interpretation',
    label: 'Interpretation',
    eyebrow: '핵심 의미',
    title: '의학적 의미를 유지한 해석',
    description: '결과 요약, 설명 우선순위, 설명 리스크를 한 화면에서 정리합니다.',
  },
  {
    id: 'summary',
    label: 'Patient Summary',
    eyebrow: '환자 설명',
    title: '환자가 이해할 수 있는 설명 초안',
    description: '질환 맥락을 유지하면서 환자 수준에 맞춘 표현으로 변환합니다.',
  },
  {
    id: 'review',
    label: 'Review',
    eyebrow: '검토 단계',
    title: '의사가 검토 후 전달',
    description: '최종 설명 주도권은 의사가 유지하고, AI는 검토용 초안을 제공합니다.',
  },
];

const queueItems = [
  { label: '핵심 결과 확인', flagged: true },
  { label: '환자 친화 표현 선택', flagged: false },
  { label: '추가 설명 포인트 정리', flagged: true },
] as const;

const shortcutItems = [
  { key: 'Y', action: '환자 이해 가능' },
  { key: 'N', action: '설명 보완 필요' },
  { key: '1', action: '핵심 설명 선택' },
  { key: '9', action: '마지막 설명 선택' },
  { key: '>', action: '다음 단계 이동' },
  { key: '<', action: '이전 단계 이동' },
  { key: 'esc', action: '검토 종료' },
  { key: 'enter', action: '설명 확정' },
] as const;

const availableTags = ['유전자 변이', '병기', '치료 옵션', '예후', '부작용', '추가 검사'];
const dispositions = ['설명 보조', '의사 검토 필요', '환자 전달 준비'];
const chartData: ChartDatum[] = [
  { month: '07/24', score: 0.42, bars: [32, 46, 28] },
  { month: '08/24', score: 0.48, bars: [36, 52, 30] },
  { month: '09/24', score: 0.51, bars: [38, 58, 32] },
  { month: '10/24', score: 0.57, bars: [44, 64, 36] },
  { month: '11/24', score: 0.63, bars: [48, 72, 40] },
  { month: '12/24', score: 0.7, bars: [52, 84, 44] },
];

export function LandingFeatureShowcase({
  label,
  title,
  subtitle,
  features,
}: LandingFeatureShowcaseProps) {
  const [activeTab, setActiveTab] = useState<TabId>('interpretation');
  const [activeQueueItem, setActiveQueueItem] = useState(0);
  const [activeShortcut, setActiveShortcut] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(['유전자 변이', '병기']);
  const [dispositionIndex, setDispositionIndex] = useState(0);
  const [oneToMany, setOneToMany] = useState(true);
  const [hoveredMonth, setHoveredMonth] = useState(chartData.length - 1);

  const currentTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTab) ?? tabs[0],
    [activeTab],
  );

  const selectedFeatureIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const toggleTag = (tag: string) => {
    setSelectedTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag],
    );
  };

  return (
    <section className="monet-feature-section" id="features">
      <div className="monet-feature-grid">
        <div className="monet-dashboard-mockup">
          <article className="dashboard-mini-chart-card">
            <div className="dashboard-chart-surface">
              <div className={`dashboard-chart-area is-${activeTab}`} />
              <div className={`dashboard-chart-line is-${activeTab}`} />
            </div>
            <div className="dashboard-chart-meta">
              <span>{currentTab.eyebrow}</span>
              <strong>{chartData[hoveredMonth].score.toFixed(2)}</strong>
            </div>
          </article>

          <article className="dashboard-sidebar-card">
            {queueItems.map((item, index) => (
              <button
                key={item.label}
                type="button"
                className={`dashboard-sidebar-item ${item.flagged ? 'danger' : ''} ${index === activeQueueItem ? 'is-active' : ''}`}
                onClick={() => setActiveQueueItem(index)}
                aria-pressed={index === activeQueueItem}
              >
                <span className="dashboard-checkbox" />
                <span>{item.label}</span>
              </button>
            ))}

            <button type="button" className="dashboard-sidebar-button">
              설명 초안 생성
            </button>
          </article>

          <article className="dashboard-main-card">
            <div className="dashboard-toolbar" role="tablist" aria-label="설명 워크플로우 탭">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`dashboard-tag ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="dashboard-main-content">
              <div className="dashboard-summary-panel">
                <span className="panel-label">{currentTab.eyebrow}</span>
                <strong>{currentTab.title}</strong>
                <p>{currentTab.description}</p>
              </div>

              <div className="dashboard-shortcuts-panel">
                <span className="panel-label">환자 설명 포인트</span>
                <ul>
                  {features.map((feature, index) => (
                    <li key={feature.title} className={index === selectedFeatureIndex ? 'is-active' : undefined}>
                      {feature.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article className="dashboard-response-card">
            <h3>설명 초안 구성</h3>

            <div className="dashboard-tag-group">
              <span className="panel-label">포함 항목</span>
              <div className="dashboard-selected-tags">
                {selectedTags.map((tag) => (
                  <button key={tag} type="button" className="dashboard-chip selected" onClick={() => toggleTag(tag)}>
                    {tag}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
              <div className="dashboard-available-tags">
                {availableTags.filter((tag) => !selectedTags.includes(tag)).map((tag) => (
                  <button key={tag} type="button" className="dashboard-chip" onClick={() => toggleTag(tag)}>
                    {tag}
                    <span aria-hidden="true">＋</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="dashboard-response-row">
              <span className="panel-label">상태</span>
              <button
                type="button"
                className="dashboard-disposition-button"
                onClick={() => setDispositionIndex((currentIndex) => (currentIndex + 1) % dispositions.length)}
              >
                {dispositions[dispositionIndex]}
                <span aria-hidden="true">▾</span>
              </button>
            </div>

            <div className="dashboard-note-panel">
              <span className="panel-label">설명 메모</span>
              <p>{currentTab.description}</p>
            </div>
          </article>

          <article className="dashboard-shortcut-card">
            <h3>Keyboard shortcuts</h3>
            <div className="dashboard-shortcut-grid">
              {shortcutItems.map((shortcut, index) => (
                <button
                  key={shortcut.key}
                  type="button"
                  className={`dashboard-shortcut-row ${index === activeShortcut ? 'is-active' : ''}`}
                  onMouseEnter={() => setActiveShortcut(index)}
                  onFocus={() => setActiveShortcut(index)}
                  onClick={() => setActiveShortcut(index)}
                >
                  <span className="shortcut-key">{shortcut.key}</span>
                  <span className="shortcut-action">{shortcut.action}</span>
                </button>
              ))}
            </div>

            <div className="dashboard-toggle-row">
              <span>One to many</span>
              <button
                type="button"
                className={`dashboard-toggle ${oneToMany ? 'is-on' : ''}`}
                onClick={() => setOneToMany((currentValue) => !currentValue)}
                aria-pressed={oneToMany}
              >
                <span />
              </button>
            </div>
          </article>

          <article className="dashboard-bar-card">
            <div className="dashboard-bar-header">
              <h3>설명 품질 추세</h3>
              <div className="dashboard-bar-legend">
                <span><i className="legend-a" /> A</span>
                <span><i className="legend-b" /> B</span>
                <span><i className="legend-c" /> C</span>
              </div>
            </div>

            <div className="dashboard-bar-grid">
              {chartData.map((datum, index) => (
                <button
                  key={datum.month}
                  type="button"
                  className={`dashboard-bar-group ${index === hoveredMonth ? 'is-active' : ''}`}
                  onMouseEnter={() => setHoveredMonth(index)}
                  onFocus={() => setHoveredMonth(index)}
                  onClick={() => setHoveredMonth(index)}
                  aria-label={`${datum.month} 설명 품질 보기`}
                >
                  <div className="dashboard-bars">
                    {datum.bars.map((value, barIndex) => (
                      <span
                        key={`${datum.month}-${barIndex}`}
                        className={`dashboard-bar tone-${barIndex + 1}`}
                        style={{ height: `${value}%` }}
                      />
                    ))}
                  </div>

                  {index === hoveredMonth ? (
                    <span className="dashboard-bar-tooltip">
                      <strong>{datum.score.toFixed(1)}</strong>
                      <small>{datum.month}</small>
                    </span>
                  ) : null}

                  <span className="dashboard-bar-label">{datum.month}</span>
                </button>
              ))}
            </div>
          </article>
        </div>

        <div className="monet-feature-copy">
          <p className="monet-feature-label">{label}</p>
          <h2>{title}</h2>
          <p className="monet-feature-subtitle">{subtitle}</p>

          <div className="monet-feature-list">
            {features.map((feature, index) => (
              <button
                key={feature.title}
                type="button"
                className={`monet-feature-item ${index === selectedFeatureIndex ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveTab(tabs[index]?.id ?? 'interpretation')}
                onFocus={() => setActiveTab(tabs[index]?.id ?? 'interpretation')}
                onClick={() => setActiveTab(tabs[index]?.id ?? 'interpretation')}
                aria-pressed={index === selectedFeatureIndex}
              >
                <div className="monet-feature-check">✓</div>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
