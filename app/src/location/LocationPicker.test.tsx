import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { LocationPicker } from './LocationPicker.tsx';
import { DEFAULT_USER_LOCATION, type UserLocation } from './userLocation.ts';

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

function fakeGeolocation(result: { latitude: number; longitude: number } | { code: number }) {
  return {
    getCurrentPosition: vi.fn((onSuccess: Success, onError?: Failure | null) => {
      if ('code' in result) {
        onError?.({
          code: result.code,
          PERMISSION_DENIED: 1,
          message: '',
        } as GeolocationPositionError);
      } else {
        onSuccess({ coords: result } as GeolocationPosition);
      }
    }),
  } as unknown as Geolocation;
}

function setup(geolocation?: Geolocation) {
  const onChange = vi.fn<(l: UserLocation) => void>();
  render(
    <LocationPicker
      location={DEFAULT_USER_LOCATION}
      onChange={onChange}
      geolocation={geolocation}
    />,
  );
  return onChange;
}

describe('LocationPicker', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('is always open in the settings, saying how the place was chosen', () => {
    const onChange = vi.fn<(l: UserLocation) => void>();
    render(
      <LocationPicker
        location={{ ...DEFAULT_USER_LOCATION, source: 'manual' }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Escolhida da lista')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1090700' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'Guarda' }));
  });

  it('shows the current place and lists locations grouped by district', () => {
    setup();
    expect(screen.getByText('Coimbra', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Por omissão: escolha a sua')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Faro' })).toHaveTextContent(
      /Loulé.*Portimão.*Sagres/,
    );
    expect(screen.getAllByRole('option')).toHaveLength(25); // 24 places + placeholder
  });

  it('chooses a place from the list', () => {
    const onChange = setup();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1090700' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Guarda', ipmaId: 1090700, district: 9, source: 'manual' }),
    );
  });

  it('uses GPS coordinates and the nearest IPMA location', () => {
    const onChange = setup(fakeGeolocation({ latitude: 41.45, longitude: -8.3 }));
    fireEvent.click(screen.getByRole('button', { name: 'Usar a minha localização' }));
    expect(onChange).toHaveBeenCalledWith({
      name: 'Guimarães',
      ipmaId: 1030800,
      district: 3,
      latitude: 41.45,
      longitude: -8.3,
      source: 'gps',
    });
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('warns when the position is far from mainland Portugal', () => {
    setup(fakeGeolocation({ latitude: 48.85, longitude: 2.35 }));
    fireEvent.click(screen.getByRole('button', { name: 'Usar a minha localização' }));
    expect(screen.getByRole('status')).toHaveTextContent(/fora de Portugal continental/);
  });

  it.each([
    [1, 'Sem acesso à localização'],
    [2, 'Não foi possível obter a localização'],
  ])('explains geolocation error %i', (code, message) => {
    const onChange = setup(fakeGeolocation({ code }));
    fireEvent.click(screen.getByRole('button', { name: 'Usar a minha localização' }));
    expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('explains when the browser has no geolocation', () => {
    setup(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Usar a minha localização' }));
    expect(screen.getByRole('status')).toHaveTextContent('Este navegador não dá a localização');
  });

  it('labels a GPS location as "near"', () => {
    render(
      <LocationPicker
        location={{ ...DEFAULT_USER_LOCATION, source: 'gps' }}
        onChange={vi.fn()}
        geolocation={undefined}
      />,
    );
    expect(screen.getByText('Perto de Coimbra', { exact: false })).toBeInTheDocument();
  });
});
