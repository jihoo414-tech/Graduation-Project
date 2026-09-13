const CURRENT_YEAR = new Date().getFullYear();
const MIN_KOREAN_AGE = 1;
const MAX_KOREAN_AGE = 120;

export const birthYearOptions = Array.from({ length: MAX_KOREAN_AGE }, (_, index) => CURRENT_YEAR - index);
export const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
export const dayOptions = Array.from({ length: 31 }, (_, index) => index + 1);

export type ClinicalDraft = {
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  gender: string;
  stage: string;
};

export const emptyClinicalDraft: ClinicalDraft = {
  birthYear: '',
  birthMonth: '',
  birthDay: '',
  gender: '',
  stage: '',
};

export function isValidClinicalDraft(draft: ClinicalDraft): boolean {
  const numericBirthYear = Number(draft.birthYear);
  const numericBirthMonth = Number(draft.birthMonth);
  const numericBirthDay = Number(draft.birthDay);
  const birthDate = new Date(numericBirthYear, numericBirthMonth - 1, numericBirthDay);
  const koreanAge = CURRENT_YEAR - numericBirthYear + 1;
  const validDate =
    birthDate.getFullYear() === numericBirthYear &&
    birthDate.getMonth() === numericBirthMonth - 1 &&
    birthDate.getDate() === numericBirthDay;

  return (
    Boolean(draft.birthYear) &&
    Boolean(draft.birthMonth) &&
    Boolean(draft.birthDay) &&
    validDate &&
    birthDate <= new Date() &&
    koreanAge >= MIN_KOREAN_AGE &&
    koreanAge <= MAX_KOREAN_AGE &&
    Boolean(draft.gender) &&
    Boolean(draft.stage)
  );
}

export function toBirthDate(draft: ClinicalDraft): string {
  return `${draft.birthYear}-${draft.birthMonth.padStart(2, '0')}-${draft.birthDay.padStart(2, '0')}`;
}
