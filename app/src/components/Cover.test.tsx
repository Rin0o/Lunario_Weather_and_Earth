import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { Cover } from './Cover.tsx';

describe('Cover', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await initI18n('pt-PT');
  });
  afterEach(() => vi.useRealTimers());

  it('stays until tapped, then opens, and shows only once per session', () => {
    vi.useFakeTimers();
    const { unmount } = render(<Cover />);
    const cover = screen.getByRole('button', { name: 'Abrir o Lunário' });
    expect(cover).toHaveTextContent('Toque para abrir');
    act(() => vi.advanceTimersByTime(60_000));
    expect(cover).not.toHaveClass('opening');

    fireEvent.click(cover);
    expect(cover).toHaveClass('opening');
    act(() => vi.advanceTimersByTime(450));
    expect(screen.queryByRole('button', { name: 'Abrir o Lunário' })).toBeNull();
    unmount();

    render(<Cover />);
    expect(screen.queryByRole('button', { name: 'Abrir o Lunário' })).toBeNull();
  });

  it('still shows when the session storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<Cover />);
    expect(screen.getByRole('button', { name: 'Abrir o Lunário' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
