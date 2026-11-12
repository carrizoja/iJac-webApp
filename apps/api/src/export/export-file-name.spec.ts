import { exportFileName } from './export-file-name';

describe('exportFileName', () => {
  it('names the file with the export date', () => {
    expect(exportFileName(new Date('2026-11-12T15:30:00.000Z'), 'xlsx')).toBe(
      'ijac-export-2026-11-12.xlsx',
    );
    expect(exportFileName(new Date('2026-11-12T15:30:00.000Z'), 'json')).toBe(
      'ijac-export-2026-11-12.json',
    );
  });

  it('uses the Buenos Aires date, not the UTC one', () => {
    // 02:00 UTC on the 13th is still 23:00 on the 12th in Buenos Aires.
    expect(exportFileName(new Date('2026-11-13T02:00:00.000Z'), 'xlsx')).toBe(
      'ijac-export-2026-11-12.xlsx',
    );
  });
});
