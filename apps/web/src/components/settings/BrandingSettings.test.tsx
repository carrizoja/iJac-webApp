import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BrandingKind } from '@ijac/shared';

const { getBrandingImage, saveBrandingImage, deleteBrandingImage, ApiRequestError } = vi.hoisted(
  () => ({
    getBrandingImage: vi.fn(),
    saveBrandingImage: vi.fn(),
    deleteBrandingImage: vi.fn(),
    ApiRequestError: class ApiRequestError extends Error {
      constructor(readonly code: string) {
        super(code);
      }
    },
  }),
);

vi.mock('../../lib/resources', () => ({
  getBrandingImage,
  saveBrandingImage,
  deleteBrandingImage,
  ApiRequestError,
}));

import { setLanguage } from '../../i18n/language';
import { BrandingSettings } from './BrandingSettings';

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3];
const stored = (data: string) => ({
  image: { contentType: 'image/png', data, updatedAt: '2026-11-05T10:00:00.000Z' },
});

function pngFile(name = 'firma.png', bytes = PNG_BYTES): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

describe('BrandingSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLanguage('es');
    getBrandingImage.mockImplementation(async (kind: BrandingKind) =>
      kind === 'logo' ? stored('TE9HTw==') : { image: null },
    );
  });

  it('shows the stored logo and an empty signature slot', async () => {
    render(<BrandingSettings />);

    expect(await screen.findByRole('img', { name: 'Logo' })).toHaveAttribute(
      'src',
      'data:image/png;base64,TE9HTw==',
    );
    expect(screen.getByText('Sin imagen cargada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar logo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar firma' })).not.toBeInTheDocument();
  });

  it('uploads a PNG signature as base64 and shows its preview', async () => {
    saveBrandingImage.mockImplementation(async (_kind: BrandingKind, input: { data: string }) => ({
      contentType: 'image/png',
      data: input.data,
      updatedAt: '2026-11-05T10:00:00.000Z',
    }));
    render(<BrandingSettings />);
    await screen.findByRole('img', { name: 'Logo' });

    fireEvent.change(screen.getByLabelText('Subir firma'), { target: { files: [pngFile()] } });

    const expectedData = btoa(String.fromCharCode(...PNG_BYTES));
    await waitFor(() =>
      expect(saveBrandingImage).toHaveBeenCalledWith('signature', {
        contentType: 'image/png',
        data: expectedData,
      }),
    );
    expect(await screen.findByRole('img', { name: 'Firma' })).toHaveAttribute(
      'src',
      `data:image/png;base64,${expectedData}`,
    );
    expect(screen.getByText('Imagen guardada.')).toBeInTheDocument();
  });

  it('rejects other file types and files over 200 KB without calling the API', async () => {
    render(<BrandingSettings />);
    await screen.findByRole('img', { name: 'Logo' });

    fireEvent.change(screen.getByLabelText('Subir firma'), {
      target: { files: [new File(['<svg/>'], 'firma.svg', { type: 'image/svg+xml' })] },
    });
    expect(await screen.findByText('Usá una imagen PNG o JPG.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Subir firma'), {
      target: { files: [pngFile('grande.png', [...PNG_BYTES, ...new Array(200 * 1024).fill(0)])] },
    });
    expect(await screen.findByText('La imagen supera los 200 KB.')).toBeInTheDocument();
    expect(saveBrandingImage).not.toHaveBeenCalled();
  });

  it('shows the server rejection and keeps the previous image', async () => {
    saveBrandingImage.mockRejectedValue(new ApiRequestError('BRANDING_IMAGE_INVALID'));
    render(<BrandingSettings />);
    await screen.findByRole('img', { name: 'Logo' });

    fireEvent.change(screen.getByLabelText('Subir logo'), { target: { files: [pngFile()] } });

    expect(await screen.findByText('Usá una imagen PNG o JPG.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute(
      'src',
      'data:image/png;base64,TE9HTw==',
    );
  });

  it('removes the logo', async () => {
    deleteBrandingImage.mockResolvedValue(undefined);
    render(<BrandingSettings />);
    await screen.findByRole('img', { name: 'Logo' });

    fireEvent.click(screen.getByRole('button', { name: 'Quitar logo' }));

    await waitFor(() => expect(deleteBrandingImage).toHaveBeenCalledWith('logo'));
    await waitFor(() => expect(screen.queryByRole('img', { name: 'Logo' })).not.toBeInTheDocument());
    expect(screen.getByText('Imagen quitada.')).toBeInTheDocument();
  });

  it('reports a load failure', async () => {
    getBrandingImage.mockRejectedValue(new Error('network'));
    render(<BrandingSettings />);

    expect(await screen.findByText('No se pudieron cargar las imágenes.')).toBeInTheDocument();
  });
});
