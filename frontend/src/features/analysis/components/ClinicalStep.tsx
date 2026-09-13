import { birthYearOptions, dayOptions, monthOptions, type ClinicalDraft } from '../model/clinicalInput';

type ClinicalStepProps = {
  draft: ClinicalDraft;
  onChange: (patch: Partial<ClinicalDraft>) => void;
  onContinue: () => void;
  onDashboard: () => void;
};

export function ClinicalStep({ draft, onChange, onContinue, onDashboard }: ClinicalStepProps) {
  return (
    <>
      <div className="analysis-step-banner">
        <span>01</span>
        <div>
          <strong>환자 임상 정보</strong>
          <p>생년월일, 성별, 병기를 먼저 입력해 모델 입력값을 구성합니다.</p>
        </div>
      </div>
      <div className="builder-form-grid">
        <label>
          <span>생년월일</span>
          <div className="birth-date-selects">
            <select
              aria-label="출생 연도"
              value={draft.birthYear}
              onChange={(event) => onChange({ birthYear: event.target.value })}
            >
              <option value="">YYYY</option>
              {birthYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              aria-label="출생 월"
              value={draft.birthMonth}
              onChange={(event) => onChange({ birthMonth: event.target.value })}
            >
              <option value="">MM</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <select
              aria-label="출생 일"
              value={draft.birthDay}
              onChange={(event) => onChange({ birthDay: event.target.value })}
            >
              <option value="">DD</option>
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label>
          <span>성별</span>
          <select aria-label="성별" value={draft.gender} onChange={(event) => onChange({ gender: event.target.value })}>
            <option value="">선택</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </label>
        <label>
          <span>병기</span>
          <select aria-label="병기" value={draft.stage} onChange={(event) => onChange({ stage: event.target.value })}>
            <option value="">선택</option>
            <option value="1">Stage 1</option>
            <option value="2">Stage 2</option>
            <option value="3">Stage 3</option>
            <option value="4">Stage 4</option>
          </select>
        </label>
      </div>
      <div className="button-row analysis-actions">
        <button className="primary-button" type="button" onClick={onContinue}>
          다음 단계
        </button>
        <button className="secondary-button" type="button" onClick={onDashboard}>
          대시보드
        </button>
      </div>
    </>
  );
}
