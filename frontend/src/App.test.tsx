import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

it('shows the Supabase setup notice when client env values are missing', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Supabase 연결값이 필요합니다' })).toBeInTheDocument();
  expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeInTheDocument();
});
