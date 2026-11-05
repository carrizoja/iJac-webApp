import { useEffect, useState } from 'react';
import {
  BRANDING_CONTENT_TYPES,
  BRANDING_KINDS,
  BRANDING_MAX_BYTES,
  brandingImageSrc,
  type BrandingContentType,
  type BrandingImage,
  type BrandingKind,
} from '@ijac/shared';
import {
  ApiRequestError,
  deleteBrandingImage,
  getBrandingImage,
  saveBrandingImage,
} from '../../lib/resources';
import { Alert, Button, LoadingState } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import type { TranslationKey } from '../../i18n/translations';

type Images = Record<BrandingKind, BrandingImage | null>;
type Feedback = { type: 'success' | 'error'; key: TranslationKey } | null;

const LABELS: Record<
  BrandingKind,
  { label: TranslationKey; upload: TranslationKey; remove: TranslationKey }
> = {
  logo: {
    label: 'settings.branding.logo',
    upload: 'settings.branding.uploadLogo',
    remove: 'settings.branding.removeLogo',
  },
  signature: {
    label: 'settings.branding.signature',
    upload: 'settings.branding.uploadSignature',
    remove: 'settings.branding.removeSignature',
  },
};

/** Reads a file as base64 without the `data:` prefix. */
function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Admin-only uploads of the logo and signature printed on receipts. */
export function BrandingSettings() {
  const { t } = useLanguage();
  const [images, setImages] = useState<Images | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<BrandingKind | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    let active = true;
    Promise.all(BRANDING_KINDS.map((kind) => getBrandingImage(kind)))
      .then(([logo, signature]) => {
        if (active) setImages({ logo: logo.image, signature: signature.image });
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loadFailed) {
    return (
      <Alert type="error" role="alert">
        {t('settings.branding.loadError')}
      </Alert>
    );
  }
  if (!images) {
    return <LoadingState message={t('settings.branding.loading')} />;
  }

  const upload = async (kind: BrandingKind, file: File | undefined) => {
    if (!file) return;
    setFeedback(null);
    if (!(BRANDING_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      setFeedback({ type: 'error', key: 'settings.branding.invalidType' });
      return;
    }
    if (file.size > BRANDING_MAX_BYTES) {
      setFeedback({ type: 'error', key: 'settings.branding.tooLarge' });
      return;
    }
    setBusy(kind);
    try {
      const saved = await saveBrandingImage(kind, {
        contentType: file.type as BrandingContentType,
        data: await readBase64(file),
      });
      setImages((current) => (current ? { ...current, [kind]: saved } : current));
      setFeedback({ type: 'success', key: 'settings.branding.saved' });
    } catch (error) {
      const code = error instanceof ApiRequestError ? error.code : undefined;
      setFeedback({
        type: 'error',
        key:
          code === 'BRANDING_IMAGE_TOO_LARGE'
            ? 'settings.branding.tooLarge'
            : code === 'BRANDING_IMAGE_INVALID'
              ? 'settings.branding.invalidType'
              : 'settings.branding.error',
      });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (kind: BrandingKind) => {
    setFeedback(null);
    setBusy(kind);
    try {
      await deleteBrandingImage(kind);
      setImages((current) => (current ? { ...current, [kind]: null } : current));
      setFeedback({ type: 'success', key: 'settings.branding.removed' });
    } catch {
      setFeedback({ type: 'error', key: 'settings.branding.error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="branding-title">
      <div>
        <h2 id="branding-title" className="text-lg font-medium text-fg-primary">
          {t('settings.branding.title')}
        </h2>
        <p className="text-sm text-fg-tertiary">{t('settings.branding.hint')}</p>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          role={feedback.type === 'error' ? 'alert' : 'status'}
          onClose={() => setFeedback(null)}
        >
          {t(feedback.key)}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {BRANDING_KINDS.map((kind) => {
          const image = images[kind];
          const labels = LABELS[kind];
          return (
            <div key={kind} className="space-y-3 rounded-xl border border-border-default p-4">
              <p className="text-sm font-medium text-fg-primary">{t(labels.label)}</p>
              <div className="flex h-24 items-center justify-center rounded-md bg-white p-2">
                {image ? (
                  <img
                    src={brandingImageSrc(image)}
                    alt={t(labels.label)}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-gray-500">{t('settings.branding.empty')}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="action-brand inline-flex min-h-10 cursor-pointer items-center rounded-md border-2 px-4 text-sm font-medium focus-within:ring-2 focus-within:ring-focus">
                  {image ? t('settings.branding.replace') : t('settings.branding.upload')}
                  <input
                    type="file"
                    accept={BRANDING_CONTENT_TYPES.join(',')}
                    aria-label={t(labels.upload)}
                    className="sr-only"
                    disabled={busy !== null}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      void upload(kind, file);
                    }}
                  />
                </label>
                {image && (
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={t(labels.remove)}
                    isLoading={busy === kind}
                    disabled={busy !== null}
                    onClick={() => void remove(kind)}
                  >
                    {t('settings.branding.remove')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
