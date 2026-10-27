import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { OrganizationProfile } from '@ijac/shared';

vi.mock('../../lib/resources', async () => {
  class ApiRequestError extends Error {
    constructor(
      readonly code: string,
      readonly fieldErrors?: Record<string, string>,
    ) {
      super(code);
    }
  }
  return {
    ApiRequestError,
    getOrganizationProfile: vi.fn(),
    saveOrganizationProfile: vi.fn(),
  };
});

import {
  ApiRequestError,
  getOrganizationProfile,
  saveOrganizationProfile,
} from '../../lib/resources';
import { setLanguage } from '../../i18n/language';
import { OrganizationSettings } from './OrganizationSettings';

const profile: OrganizationProfile = {
  businessName: 'iJac IT Solutions',
  cuit: '20123456786',
  address: 'Calle 1',
  phone: '555-0100',
  updatedAt: '2026-08-07T10:00:00.000Z',
};

describe('OrganizationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an editable form with the saved values for an admin', async () => {
    vi.mocked(getOrganizationProfile).mockResolvedValue({
      configured: true,
      profile,
      canEdit: true,
    });

    render(<OrganizationSettings />);

    expect(await screen.findByLabelText(/razón social/i)).toHaveValue('iJac IT Solutions');
    expect(screen.getByLabelText(/cuit/i)).toHaveValue('20123456786');
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument();
  });

  it('confirms the save and shows the updated address', async () => {
    vi.mocked(getOrganizationProfile).mockResolvedValue({
      configured: true,
      profile,
      canEdit: true,
    });
    vi.mocked(saveOrganizationProfile).mockResolvedValue({ ...profile, address: 'Calle 2' });

    render(<OrganizationSettings />);
    fireEvent.change(await screen.findByLabelText(/dirección/i), { target: { value: 'Calle 2' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText(/perfil guardado/i)).toBeInTheDocument();
    expect(saveOrganizationProfile).toHaveBeenCalledWith({
      businessName: 'iJac IT Solutions',
      cuit: '20123456786',
      address: 'Calle 2',
      phone: '555-0100',
    });
    expect(screen.getByLabelText(/dirección/i)).toHaveValue('Calle 2');
  });

  it('shows read-only values without inputs or a save action for a member', async () => {
    vi.mocked(getOrganizationProfile).mockResolvedValue({
      configured: true,
      profile,
      canEdit: false,
    });

    render(<OrganizationSettings />);

    expect(await screen.findByText('iJac IT Solutions')).toBeInTheDocument();
    expect(screen.getByText('Calle 1')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /guardar/i })).not.toBeInTheDocument();
  });

  it('tells a member the profile is not configured yet', async () => {
    vi.mocked(getOrganizationProfile).mockResolvedValue({ configured: false, canEdit: false });

    render(<OrganizationSettings />);

    expect(await screen.findByText(/todavía no está configurado/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows an empty form with a hint when an admin has no profile yet', async () => {
    vi.mocked(getOrganizationProfile).mockResolvedValue({ configured: false, canEdit: true });

    render(<OrganizationSettings />);

    expect(await screen.findByLabelText(/razón social/i)).toHaveValue('');
    expect(screen.getByText(/todavía no está configurado/i)).toBeInTheDocument();
  });

  it('blocks submission and reports invalid fields before calling the API', async () => {
    vi.mocked(getOrganizationProfile).mockResolvedValue({ configured: false, canEdit: true });

    render(<OrganizationSettings />);
    await screen.findByLabelText(/razón social/i);
    fireEvent.change(screen.getByLabelText(/cuit/i), { target: { value: '20-12345678-7' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText(/razón social es obligatoria/i)).toBeInTheDocument();
    expect(screen.getByText(/cuit no es válido/i)).toBeInTheDocument();
    expect(saveOrganizationProfile).not.toHaveBeenCalled();
  });

  it('maps server field errors onto the matching input', async () => {
    vi.mocked(getOrganizationProfile).mockResolvedValue({
      configured: true,
      profile,
      canEdit: true,
    });
    vi.mocked(saveOrganizationProfile).mockRejectedValue(
      new ApiRequestError('VALIDATION_ERROR', { cuit: 'cuit must be a valid 11-digit CUIT' }),
    );

    render(<OrganizationSettings />);
    await screen.findByLabelText(/cuit/i);
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByText(/cuit no es válido/i)).toBeInTheDocument();
    });
  });

  it('shows unknown server field errors at form level', async () => {
    vi.mocked(getOrganizationProfile).mockResolvedValue({
      configured: true,
      profile,
      canEdit: true,
    });
    vi.mocked(saveOrganizationProfile).mockRejectedValue(
      new ApiRequestError('VALIDATION_ERROR', { 'issuer.logo': 'logo is not allowed' }),
    );

    render(<OrganizationSettings />);
    await screen.findByLabelText(/cuit/i);
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText(/no se pudo guardar el perfil/i)).toBeInTheDocument();
    expect(screen.getByText(/logo is not allowed/i)).toBeInTheDocument();
    expect(screen.queryByText(/cuit no es válido/i)).not.toBeInTheDocument();
  });

  it('shows a known field error on its input and unknown ones at form level', async () => {
    vi.mocked(getOrganizationProfile).mockResolvedValue({
      configured: true,
      profile,
      canEdit: true,
    });
    vi.mocked(saveOrganizationProfile).mockRejectedValue(
      new ApiRequestError('VALIDATION_ERROR', {
        cuit: 'cuit must be a valid 11-digit CUIT',
        extra: 'extra is not allowed',
      }),
    );

    render(<OrganizationSettings />);
    await screen.findByLabelText(/cuit/i);
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText(/cuit no es válido/i)).toBeInTheDocument();
    expect(screen.getByText(/extra is not allowed/i)).toBeInTheDocument();
  });

  it('shows a generic error when the save fails', async () => {
    vi.mocked(getOrganizationProfile).mockResolvedValue({
      configured: true,
      profile,
      canEdit: true,
    });
    vi.mocked(saveOrganizationProfile).mockRejectedValue(new Error('NETWORK_ERROR'));

    render(<OrganizationSettings />);
    await screen.findByLabelText(/cuit/i);
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText(/no se pudo guardar el perfil/i)).toBeInTheDocument();
  });

  it('shows a load error when the profile cannot be fetched', async () => {
    vi.mocked(getOrganizationProfile).mockRejectedValue(new Error('NETWORK_ERROR'));

    render(<OrganizationSettings />);

    expect(await screen.findByText(/no se pudo cargar el perfil/i)).toBeInTheDocument();
  });

  it('renders in English', async () => {
    setLanguage('en');
    vi.mocked(getOrganizationProfile).mockResolvedValue({
      configured: true,
      profile,
      canEdit: true,
    });

    render(<OrganizationSettings />);

    expect(await screen.findByLabelText(/business name/i)).toBeInTheDocument();
  });
});
