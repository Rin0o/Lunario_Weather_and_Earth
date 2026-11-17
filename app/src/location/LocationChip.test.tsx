import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { LocationChip } from './LocationChip.tsx';
import { DEFAULT_USER_LOCATION } from './userLocation.ts';

describe('LocationChip', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('shows the place, invites to choose one while it is the default, and leads to the settings', () => {
    render(<LocationChip location={DEFAULT_USER_LOCATION} />);
    const link = screen.getByRole('link', { name: /^Coimbra\s*·\s*escolher$/ });
    expect(link).toHaveAttribute('href', '#/definicoes');
  });

  it('shows a chosen place, and when it comes from the phone', () => {
    const { unmount } = render(
      <LocationChip location={{ ...DEFAULT_USER_LOCATION, source: 'manual' }} />,
    );
    expect(screen.getByRole('link', { name: 'Coimbra' })).toBeInTheDocument();
    unmount();
    render(<LocationChip location={{ ...DEFAULT_USER_LOCATION, source: 'gps' }} />);
    expect(screen.getByRole('link', { name: 'Perto de Coimbra' })).toBeInTheDocument();
  });
});
