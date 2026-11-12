import { useEffect, useId, useState } from 'react';
import { FileJson, FileSpreadsheet } from 'lucide-react';
import { OrganizationMemberRole } from '@ijac/shared';
import { Alert, Button } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { downloadDataExport, getCurrentMember } from '../../lib/resources';

type ExportFormat = 'xlsx' | 'json';

/**
 * How long the file's object URL stays valid after the click. Some browsers start the save
 * after `click()` returns, so releasing the URL right away can leave an empty or broken file.
 */
const RELEASE_URL_AFTER_MS = 10_000;

/** Hands a downloaded file to the browser's save flow. */
function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), RELEASE_URL_AFTER_MS);
}

/**
 * Lets an admin download a copy of the organization's data, as Excel or JSON. Members
 * never see it, and the API refuses them too. It renders its own section so a member's
 * Settings page has no empty box.
 */
export function DataExportSettings() {
  const { t } = useLanguage();
  const headingId = useId();
  const hintId = useId();
  // Until the role is known, nobody is offered the export.
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentMember()
      .then((member) => active && setIsAdmin(member.role === OrganizationMemberRole.ADMIN))
      .catch(() => active && setIsAdmin(false));
    return () => {
      active = false;
    };
  }, []);

  if (!isAdmin) return null;

  const download = async (format: ExportFormat) => {
    setBusy(format);
    setFailed(false);
    try {
      const file = await downloadDataExport(format);
      saveFile(file.blob, file.filename);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const label = (format: ExportFormat) =>
    busy === format
      ? t('settings.export.downloading')
      : t(format === 'xlsx' ? 'settings.export.excel' : 'settings.export.json');

  return (
    <section
      className="mt-6 rounded-2xl border border-border-default bg-bg-secondary/80 p-4 sm:p-6"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="mb-2 font-heading text-xl font-semibold text-fg-primary">
        {t('settings.export.heading')}
      </h2>
      <p className="text-fg-secondary">{t('settings.export.description')}</p>
      <p id={hintId} className="mt-2 text-sm text-fg-secondary">
        {t('settings.export.hint')}
      </p>
      {failed && (
        <Alert type="error" className="mt-4">
          {t('settings.export.error')}
        </Alert>
      )}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="primary"
          isLoading={busy === 'xlsx'}
          disabled={busy !== null}
          aria-describedby={hintId}
          onClick={() => void download('xlsx')}
          startIcon={
            busy === 'xlsx' ? undefined : <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
          }
          className="min-h-11 rounded-xl px-5"
        >
          {label('xlsx')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          isLoading={busy === 'json'}
          disabled={busy !== null}
          aria-describedby={hintId}
          onClick={() => void download('json')}
          startIcon={
            busy === 'json' ? undefined : <FileJson aria-hidden="true" className="h-4 w-4" />
          }
          className="min-h-11 rounded-xl px-5"
        >
          {label('json')}
        </Button>
      </div>
    </section>
  );
}
