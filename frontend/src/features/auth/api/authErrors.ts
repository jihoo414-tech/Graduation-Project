const INVALID_CREDENTIALS_MESSAGE =
  '이메일 또는 비밀번호가 일치하지않습니다. 다시 확인해 주세요.';

export function authErrorMessage(error: unknown, mode: 'login' | 'signup'): string {
  if (error && typeof error === 'object') {
    const code = 'code' in error ? error.code : undefined;
    const message = 'message' in error ? error.message : undefined;
    const name = 'name' in error ? error.name : undefined;

    if (name === 'AuthRetryableFetchError' || name === 'TypeError' || code === 'request_timeout') {
      return '인증 서비스에 연결하지 못했습니다. 인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요.';
    }

    if (code === 'invalid_credentials' || message === 'Invalid login credentials') {
      return INVALID_CREDENTIALS_MESSAGE;
    }
    if (code === 'email_not_confirmed') {
      return '이메일 인증이 완료되지 않았습니다. 인증 메일을 확인해 주세요.';
    }
    if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') {
      return mode === 'login'
        ? '로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
        : '회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code === 'email_exists' || code === 'user_already_exists') {
      return '이미 가입된 이메일입니다. 로그인하거나 다른 이메일로 가입해 주세요.';
    }
    if (code === 'weak_password') {
      return '비밀번호가 보안 기준을 충족하지 않습니다. 더 길고 추측하기 어려운 비밀번호를 입력해 주세요.';
    }
    if (code === 'email_address_invalid' || code === 'validation_failed') {
      return '가입 정보 형식이 올바르지 않습니다. 이메일 주소와 비밀번호를 확인해 주세요.';
    }
    if (code === 'signup_disabled') {
      return '현재 회원가입이 중단되어 있습니다. 관리자에게 문의해 주세요.';
    }
    if (code === 'user_banned') {
      return '이 계정은 이용이 제한되어 있습니다. 관리자에게 문의해 주세요.';
    }
  }

  return mode === 'login'
    ? '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    : '회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
