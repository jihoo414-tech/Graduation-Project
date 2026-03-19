import { useEffect, useState } from 'react';
import type { MouseEventHandler } from 'react';

type NavigationItem = {
  label: string;
  href: string;
};

type LandingHeroProps = {
  navigationItems: NavigationItem[];
  onPrimaryClick?: MouseEventHandler<HTMLAnchorElement>;
  onSecondaryClick?: MouseEventHandler<HTMLAnchorElement>;
};

type HeroSignal = {
  label: string;
  title: string;
  description: string;
  detail: string;
  positionClassName: string;
};

const heroSignals: HeroSignal[] = [
  {
    label: 'Patient Data',
    title: '검사 결과 + 유전체 데이터',
    description: '설명의 시작점이 되는 임상·유전체 데이터를 한 번에 정리합니다.',
    detail: '입력값이 구조화되면 AI가 설명에 필요한 포인트를 더 정확하게 추출할 수 있습니다.',
    positionClassName: 'hero-data-card-main',
  },
  {
    label: 'Interpretation',
    title: '핵심 의미 추출',
    description: '결과의 의미와 설명 우선순위를 빠르게 요약합니다.',
    detail: '복잡한 결과를 환자 설명 흐름으로 바꾸기 위해 우선 설명해야 할 포인트를 먼저 세웁니다.',
    positionClassName: 'hero-data-card-side',
  },
  {
    label: 'Patient-friendly Output',
    title: '환자용 설명 자동 생성',
    description: '의학적 의미를 유지하면서 환자가 이해할 수 있는 언어로 바꿉니다.',
    detail: '설명 초안이 만들어지면 의사는 검토와 보완에 집중할 수 있습니다.',
    positionClassName: 'hero-data-card-bottom',
  },
];

function BrandLogo() {
  return (
    <svg
      width="80"
      height="32"
      viewBox="0 0 80 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 8C8 3.58172 11.5817 0 16 0C20.4183 0 24 3.58172 24 8C24 12.4183 20.4183 16 16 16C11.5817 16 8 12.4183 8 8Z"
        fill="#574FF2"
      />
      <path d="M0 16C0 11.5817 3.58172 8 8 8V24C3.58172 24 0 20.4183 0 16Z" fill="#574FF2" />
      <path
        d="M24 16C24 11.5817 27.5817 8 32 8C36.4183 8 40 11.5817 40 16C40 20.4183 36.4183 24 32 24C27.5817 24 24 20.4183 24 16Z"
        fill="#574FF2"
      />
      <path d="M16 24C16 19.5817 19.5817 16 24 16V32C19.5817 32 16 28.4183 16 24Z" fill="#574FF2" />
      <path
        d="M40 24C40 19.5817 43.5817 16 48 16C52.4183 16 56 19.5817 56 24C56 28.4183 52.4183 32 48 32C43.5817 32 40 28.4183 40 24Z"
        fill="#574FF2"
      />
      <path
        d="M32 32C32 27.5817 35.5817 24 40 24V40C35.5817 40 32 36.4183 32 32Z"
        fill="#574FF2"
        transform="translate(0, -8)"
      />
    </svg>
  );
}

export function LandingHero({ navigationItems, onPrimaryClick, onSecondaryClick }: LandingHeroProps) {
  const [activeSignalIndex, setActiveSignalIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSignalIndex((currentIndex) => (currentIndex + 1) % heroSignals.length);
    }, 3400);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const activeSignal = heroSignals[activeSignalIndex];

  return (
    <section className="monet-hero-shell" aria-labelledby="hero-title">
      <div className="monet-hero-nav">
        <a className="monet-brand" href="#top">
          <BrandLogo />
          <span className="monet-brand-copy">
            <strong>Medical Explain AI</strong>
            <small>의사 중심 환자 설명 보조 도구</small>
          </span>
        </a>

        <nav className="monet-nav-links" aria-label="주요 섹션">
          {navigationItems.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="monet-nav-actions">
          <button type="button" className="monet-language-pill" aria-label="언어 설정">
            KR
          </button>
          <a className="monet-contact-pill" href="#interactive-demo" onClick={onPrimaryClick}>
            데모 요청
            <span aria-hidden="true">▾</span>
          </a>
        </div>
      </div>

      <div className="monet-hero-card">
        <div className="monet-hero-copy-panel">
          <p className="monet-kicker">AI 해석 기반 환자 설명 워크플로우</p>
          <h1 id="hero-title">복잡한 환자 데이터를, 환자에게 설명할 수 있게</h1>
          <p className="monet-hero-description">
            환자 데이터를 입력하면 AI가 결과를 해석하고, 환자가 이해할 수 있는 언어로 자동 변환합니다.
            이해는 했지만 설명하기 어려운 순간을 줄이고, 진료 현장에서 더 빠르고 명확한 상담을 돕습니다.
          </p>

          <div className="monet-hero-buttons">
            <a className="monet-primary-cta" href="#interactive-demo" onClick={onPrimaryClick}>
              데모 요청하기
              <span aria-hidden="true">→</span>
            </a>
            <a className="monet-secondary-cta" href="#how-it-works" onClick={onSecondaryClick}>
              작동 방식 보기
            </a>
          </div>

          <div className="monet-hero-microproofs">
            <span>설명까지 책임지는 도구</span>
            <span>의료 맥락 유지</span>
            <span>5분 데모 제공</span>
          </div>

          <p className="monet-hero-support">신용카드 필요 없음 · 5분 데모 제공</p>
        </div>

        <div className="monet-hero-visual-panel">
          <div className="hero-orbit hero-orbit-back" />
          <div className="hero-orbit hero-orbit-front" />

          {heroSignals.map((signal, index) => (
            <button
              key={signal.label}
              type="button"
              className={`hero-data-card ${signal.positionClassName} ${index === activeSignalIndex ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveSignalIndex(index)}
              onFocus={() => setActiveSignalIndex(index)}
              onClick={() => setActiveSignalIndex(index)}
              aria-pressed={index === activeSignalIndex}
            >
              <span>{signal.label}</span>
              <strong>{signal.title}</strong>
              <p>{signal.description}</p>
            </button>
          ))}

          <article className="hero-callout-card">
            <span className="hero-callout-label">{activeSignal.label}</span>
            <strong>{activeSignal.title}</strong>
            <p>{activeSignal.detail}</p>
            <div className="hero-callout-progress">
              {heroSignals.map((signal, index) => (
                <span key={signal.label} className={index === activeSignalIndex ? 'is-active' : undefined} />
              ))}
            </div>
          </article>

          <div className="hero-node hero-node-a" />
          <div className="hero-node hero-node-b" />
          <div className="hero-node hero-node-c" />
        </div>
      </div>
    </section>
  );
}
