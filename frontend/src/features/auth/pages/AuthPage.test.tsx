import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthPage } from './AuthPage';

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock('../api/supabase', () => ({
  supabase: { auth: { signInWithPassword: signIn } },
}));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it.each([
  [{ code: 'invalid_credentials', message: 'Invalid login credentials' },
    '이메일 또는 비밀번호가 일치하지않습니다. 다시 확인해 주세요.'],
  [{ message: 'Invalid login credentials' },
    '이메일 또는 비밀번호가 일치하지않습니다. 다시 확인해 주세요.'],
  [{ code: 'email_not_confirmed', message: 'Email not confirmed' },
    '이메일 인증이 완료되지 않았습니다. 인증 메일을 확인해 주세요.'],
  [{ code: 'over_request_rate_limit', message: 'Rate limit exceeded' },
    '로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'],
  [{ code: 'unexpected_failure', message: 'Internal server details' },
    '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.'],
])('shows a Korean message for %j', async (error, expected) => {
  signIn.mockResolvedValue({ error, data: { session: null } });
  const user = userEvent.setup();
  render(<AuthPage />);
  await user.type(screen.getByLabelText('이메일'), 'test@example.com');
  await user.type(screen.getByLabelText('비밀번호'), 'wrong-password');
  await user.click(screen.getByRole('button', { name: '로그인' }));
  expect(await screen.findByText(expected)).toBeInTheDocument();
  expect(screen.queryByText(error.message)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled();
});

it('allows retry after a network exception without exposing its message', async () => {
  signIn.mockRejectedValue(new TypeError('Failed to fetch'));
  const user = userEvent.setup();
  render(<AuthPage />);
  await user.type(screen.getByLabelText('이메일'), 'test@example.com');
  await user.type(screen.getByLabelText('비밀번호'), 'test-password');
  await user.click(screen.getByRole('button', { name: '로그인' }));
  expect(await screen.findByText('인증 서비스에 연결하지 못했습니다. 인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
  expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled();
});
