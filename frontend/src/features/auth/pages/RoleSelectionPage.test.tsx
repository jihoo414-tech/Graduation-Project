import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { RoleSelectionPage } from './RoleSelectionPage';

it('requires a patient or staff portal selection before authentication', async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<RoleSelectionPage onSelect={onSelect} />);

  await user.click(screen.getByRole('button', { name: /환자/ }));
  await user.click(screen.getByRole('button', { name: /관리자/ }));

  expect(onSelect).toHaveBeenNthCalledWith(1, 'patient');
  expect(onSelect).toHaveBeenNthCalledWith(2, 'staff');
});
