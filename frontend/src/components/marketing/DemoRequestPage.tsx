import { useState } from 'react';
import type { MouseEventHandler } from 'react';

type DemoRequestPageProps = {
  onBack: MouseEventHandler<HTMLButtonElement>;
  onContinueToDashboard: MouseEventHandler<HTMLButtonElement>;
};

export function DemoRequestPage({ onBack, onContinueToDashboard }: DemoRequestPageProps) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="marketing-shell">
      <section className="demo-request-shell">
        <div className="demo-request-form-panel">
          <p className="marketing-kicker">Demo Request</p>
          <h1>데모 요청</h1>
          <p>마케팅 폼이 아니라 실제 B2B 리드 수집 화면이라는 가정으로 구성했습니다.</p>

          <form
            className="demo-request-form"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(true);
            }}
          >
            <label>
              <span>이름</span>
              <input type="text" defaultValue="김메드" />
            </label>
            <label>
              <span>소속 기관</span>
              <input type="text" defaultValue="Seoul Medical Center" />
            </label>
            <label>
              <span>전문 분야</span>
              <input type="text" defaultValue="종양내과" />
            </label>
            <label>
              <span>이메일</span>
              <input type="email" defaultValue="doctor@example.com" />
            </label>
            <label>
              <span>사용 목적</span>
              <input type="text" defaultValue="암 진단 결과 해석 및 환자 설명 지원" />
            </label>
            <label>
              <span>문의 내용</span>
              <textarea rows={5} defaultValue="재발 위험 해석과 환자 설명 생성 데모를 확인하고 싶습니다." />
            </label>

            <div className="button-row">
              <button type="submit" className="primary-button">
                데모 요청 보내기
              </button>
              <button type="button" className="secondary-button" onClick={onBack}>
                랜딩으로 돌아가기
              </button>
            </div>
          </form>

          {submitted ? (
            <div className="inline-success-card">
              <strong>데모 요청이 접수되었다고 가정합니다.</strong>
              <p>지금은 하드코딩 흐름이므로 바로 로그인 후 대시보드로 이동할 수 있습니다.</p>
              <button type="button" className="primary-button" onClick={onContinueToDashboard}>
                데모 계정으로 계속
              </button>
            </div>
          ) : null}
        </div>

        <aside className="demo-request-info-panel">
          <h2>어떤 데모를 보여주나요?</h2>
          <ul className="detail-list">
            <li>케이스 생성부터 분석 결과 검토까지 전체 흐름</li>
            <li>위험도 요약, 근거 해석, 환자 설명용 요약 생성</li>
            <li>리포트 저장과 의료진용 워크플로우 시나리오</li>
          </ul>

          <h2>누구에게 적합한가요?</h2>
          <ul className="detail-list">
            <li>암 진단 의사</li>
            <li>병리학/유전체 분석 관련 의료진</li>
            <li>임상 해석과 환자 설명 부담을 줄이고 싶은 팀</li>
          </ul>

          <h2>예상 도입 시나리오</h2>
          <ul className="detail-list">
            <li>신규 케이스 결과 해석 보조</li>
            <li>진료 전 상담 요약 준비</li>
            <li>내부 파일럿/POC 검토</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
