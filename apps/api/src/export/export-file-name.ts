/** The business's time zone: an export taken late at night is named for that day. */
const FILE_DATE_TIME_ZONE = 'America/Argentina/Buenos_Aires';

// en-CA formats dates as YYYY-MM-DD.
const fileDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: FILE_DATE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `ijac-export-<YYYY-MM-DD>.<extension>`, dated in Buenos Aires time. */
export function exportFileName(exportedAt: Date, extension: 'xlsx' | 'json'): string {
  return `ijac-export-${fileDate.format(exportedAt)}.${extension}`;
}
