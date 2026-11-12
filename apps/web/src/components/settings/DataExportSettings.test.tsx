import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OrganizationMemberRole } from '@ijac/shared';

vi.mock('../../lib/resources', () => ({
  getCurrentMember: vi.fn(),
  downloadDataExport: vi.fn(),
}));

import { downloadDataExport, getCurrentMember } from '../../lib/resources';
import { DataExportSettings } from './DataExportSettings';

function file(name: string) {
  return { blob: new Blob(['bytes']), filename: name };
}

describe('DataExportSettings', () => {
  let clicked: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    clicked = [];
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:export'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the data backup section with both buttons to an admin', async () => {
    vi.mocked(getCurrentMember).mockResolvedValue({ role: OrganizationMemberRole.ADMIN });

    render(<DataExportSettings />);

    expect(await screen.findByRole('heading', { name: 'Respaldo de datos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Descargar copia (JSON)' })).toBeEnabled();
    expect(screen.getByText(/guardalo en un lugar seguro/)).toBeInTheDocument();
  });

  it('shows nothing to a member', async () => {
    vi.mocked(getCurrentMember).mockResolvedValue({ role: OrganizationMemberRole.MEMBER });

    const { container } = render(<DataExportSettings />);

    await waitFor(() => expect(getCurrentMember).toHaveBeenCalled());
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('Respaldo de datos')).not.toBeInTheDocument();
  });

  it('shows nothing when the role cannot be read', async () => {
    vi.mocked(getCurrentMember).mockRejectedValue(new Error('UNAUTHORIZED'));

    const { container } = render(<DataExportSettings />);

    await waitFor(() => expect(getCurrentMember).toHaveBeenCalled());
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['Exportar a Excel', 'xlsx', 'ijac-export-2026-11-12.xlsx'],
    ['Descargar copia (JSON)', 'json', 'ijac-export-2026-11-12.json'],
  ] as const)('"%s" downloads the %s file and saves it', async (label, format, name) => {
    vi.mocked(getCurrentMember).mockResolvedValue({ role: OrganizationMemberRole.ADMIN });
    vi.mocked(downloadDataExport).mockResolvedValue(file(name));
    render(<DataExportSettings />);

    fireEvent.click(await screen.findByRole('button', { name: label }));

    await waitFor(() => expect(clicked).toEqual([name]));
    expect(downloadDataExport).toHaveBeenCalledWith(format);
  });

  it('releases the file link only after the browser has had time to start the save', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.mocked(getCurrentMember).mockResolvedValue({ role: OrganizationMemberRole.ADMIN });
      vi.mocked(downloadDataExport).mockResolvedValue(file('ijac-export-2026-11-12.xlsx'));
      render(<DataExportSettings />);

      fireEvent.click(await screen.findByRole('button', { name: 'Exportar a Excel' }));
      await waitFor(() => expect(clicked).toEqual(['ijac-export-2026-11-12.xlsx']));

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(10_000);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export');
    } finally {
      vi.useRealTimers();
    }
  });

  it('disables both buttons while a download is in progress', async () => {
    vi.mocked(getCurrentMember).mockResolvedValue({ role: OrganizationMemberRole.ADMIN });
    let finish: (value: ReturnType<typeof file>) => void = () => {};
    vi.mocked(downloadDataExport).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<DataExportSettings />);

    fireEvent.click(await screen.findByRole('button', { name: 'Exportar a Excel' }));

    expect(await screen.findByText('Descargando…')).toBeInTheDocument();
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();

    finish(file('ijac-export-2026-11-12.xlsx'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toBeEnabled(),
    );
    expect(screen.getByRole('button', { name: 'Descargar copia (JSON)' })).toBeEnabled();
  });

  it('shows an error when the download fails, and can be tried again', async () => {
    vi.mocked(getCurrentMember).mockResolvedValue({ role: OrganizationMemberRole.ADMIN });
    vi.mocked(downloadDataExport)
      .mockRejectedValueOnce(new Error('HTTP_ERROR'))
      .mockResolvedValueOnce(file('ijac-export-2026-11-12.xlsx'));
    render(<DataExportSettings />);

    fireEvent.click(await screen.findByRole('button', { name: 'Exportar a Excel' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo descargar el archivo. Probá de nuevo.',
    );
    const retry = screen.getByRole('button', { name: 'Exportar a Excel' });
    expect(retry).toBeEnabled();

    fireEvent.click(retry);
    await waitFor(() => expect(clicked).toEqual(['ijac-export-2026-11-12.xlsx']));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
