import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { afterEach, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('@supabase/supabase-js');
  vi.resetModules();
});

it('shows the Supabase setup notice when client env values are missing', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

  const { default: App } = await import('./App');
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Supabase 연결값이 필요합니다' })).toBeInTheDocument();
  expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeInTheDocument();
});

it('shows a session-check message while auth state is loading', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example-project.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'example-anon-key');
  vi.doMock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: {
        getSession: () => new Promise(() => undefined),
        onAuthStateChange: () => ({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }),
      },
    }),
  }));

  const { default: App } = await import('./App');
  render(<App />);

  expect(screen.getByRole('heading', { name: '로그인 상태 확인 중' })).toBeInTheDocument();
  expect(screen.queryByText('모델 예측 수행 중')).not.toBeInTheDocument();
});
