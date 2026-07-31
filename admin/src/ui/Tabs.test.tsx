import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

test('renderiza abas e chama onChange no clique', () => {
  const onChange = vi.fn();
  render(<Tabs tabs={['A', 'B']} active="A" onChange={onChange} />);
  fireEvent.click(screen.getByText('B'));
  expect(onChange).toHaveBeenCalledWith('B');
});
