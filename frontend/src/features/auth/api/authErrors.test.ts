import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authErrors';

describe('signup errors', () => {
  it.each([
    ['email_exists', '이미 가입된 이메일'],
    ['user_already_exists', '이미 가입된 이메일'],
    ['weak_password', '비밀번호가 보안 기준'],
    ['signup_disabled', '현재 회원가입이 중단'],
    ['email_address_invalid', '가입 정보 형식'],
    ['over_email_send_rate_limit', '회원가입 요청이 너무 많습니다'],
    ['user_banned', '이 계정은 이용이 제한'],
  ])('explains %s without exposing the original message', (code, expected) => {
    const message = authErrorMessage({ code, message: 'private details' }, 'signup');
    expect(message).toContain(expected);
    expect(message).not.toContain('private');
  });

  it('uses a localized fallback for an unknown signup error', () => {
    expect(authErrorMessage({ message: 'Internal failure' }, 'signup'))
      .toBe('회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  });
});
