import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('mostra o rótulo do estado conectado com @', () => {
  render(<Badge status={{ state: 'connected', username: 'ana', room: '1' }} />);
  expect(screen.getByText(/conectado/)).toBeInTheDocument();
  expect(screen.getByText(/@ana/)).toBeInTheDocument();
});
