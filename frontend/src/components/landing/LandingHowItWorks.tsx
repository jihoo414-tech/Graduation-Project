import { useState } from 'react';

type StepItem = {
  title: string;
  description: string;
  tone: 'lavender' | 'mint' | 'sky';
};

type LandingHowItWorksProps = {
  title: string;
  description: string;
  steps: StepItem[];
};

const stepHighlights = [
  ['검사 결과 업로드', '설명 포인트 정리'],
  ['핵심 의미 구조화', '우선 설명할 내용 제안'],
  ['환자 친화 언어 변환', '의사 검토 후 전달'],
];

export function LandingHowItWorks({ title, description, steps }: LandingHowItWorksProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = steps[activeStepIndex];

  return (
    <section className="monet-steps-section" id="how-it-works">
      <div className="monet-section-header monet-section-header-split">
        <h2>
          {title}
          <span>—의사가 주도권을 유지하는 설명 보조 흐름</span>
        </h2>
        <p>{description}</p>
      </div>

      <div className="monet-steps-layout">
        <div className="monet-steps-grid">
          {steps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              className={`monet-step-card ${index === activeStepIndex ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveStepIndex(index)}
              onFocus={() => setActiveStepIndex(index)}
              onClick={() => setActiveStepIndex(index)}
              aria-pressed={index === activeStepIndex}
            >
              <div className={`monet-step-visual ${step.tone}`}>
                <span>STEP {index + 1}</span>
                <strong>{step.title}</strong>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </button>
          ))}
        </div>

        <aside className="monet-step-detail-card">
          <span className="monet-step-detail-label">ACTIVE STEP</span>
          <h3>
            STEP {activeStepIndex + 1}. {activeStep.title}
          </h3>
          <p>{activeStep.description}</p>

          <ul className="monet-step-detail-list">
            {stepHighlights[activeStepIndex].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="monet-step-progress">
            {steps.map((step, index) => (
              <button
                key={step.title}
                type="button"
                className={index === activeStepIndex ? 'is-active' : undefined}
                onClick={() => setActiveStepIndex(index)}
                aria-label={`${step.title} 보기`}
              />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
