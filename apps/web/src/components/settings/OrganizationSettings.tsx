import { useEffect, useState } from 'react';
import { isValidCuit, normalizeTaxId } from '@ijac/shared';
import type { OrganizationProfile, OrganizationProfileInput } from '@ijac/shared';
import {
  ApiRequestError,
  getOrganizationProfile,
  saveOrganizationProfile,
} from '../../lib/resources';
import { Alert, Button, Input, LoadingState } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { BrandingSettings } from './BrandingSettings';
import type { TranslationKey } from '../../i18n/translations';

type Field = keyof OrganizationProfileInput;
type FormErrors = Partial<Record<Field | 'general', string>>;

interface LoadedState {
  status: 'ready';
  profile: OrganizationProfile | null;
  canEdit: boolean;
}

type State = { status: 'loading' } | { status: 'error' } | LoadedState;

const FIELDS: Array<{ name: Field; labelKey: TranslationKey; requiredKey: TranslationKey }> = [
  {
    name: 'businessName',
    labelKey: 'settings.businessName',
    requiredKey: 'settings.validation.businessName',
  },
  { name: 'cuit', labelKey: 'settings.cuit', requiredKey: 'settings.validation.cuitRequired' },
  { name: 'address', labelKey: 'settings.address', requiredKey: 'settings.validation.address' },
  { name: 'phone', labelKey: 'settings.phone', requiredKey: 'settings.validation.phone' },
];

function toForm(profile: OrganizationProfile | null): OrganizationProfileInput {
  return {
    businessName: profile?.businessName ?? '',
    cuit: profile?.cuit ?? '',
    address: profile?.address ?? '',
    phone: profile?.phone ?? '',
  };
}

export function OrganizationSettings() {
  const { t } = useLanguage();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [form, setForm] = useState<OrganizationProfileInput>(toForm(null));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getOrganizationProfile()
      .then((response) => {
        if (!active) return;
        const profile = response.configured ? response.profile : null;
        setForm(toForm(profile));
        setState({ status: 'ready', profile, canEdit: response.canEdit });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') {
    return <LoadingState message={t('settings.loading')} data-testid="settings-loading" />;
  }

  if (state.status === 'error') {
    return (
      <Alert type="error" role="alert">
        {t('settings.loadError')}
      </Alert>
    );
  }

  const { profile, canEdit } = state;
  const notConfigured = (
    <Alert type="info" role="status">
      {t('settings.notConfigured')}
    </Alert>
  );

  if (!canEdit) {
    if (!profile) return notConfigured;
    return (
      <dl className="grid gap-4 sm:grid-cols-2" data-testid="organization-profile-readonly">
        {FIELDS.map((field) => (
          <div key={field.name}>
            <dt className="text-sm font-medium text-fg-tertiary">{t(field.labelKey)}</dt>
            <dd className="mt-1 text-fg-primary">{profile[field.name]}</dd>
          </div>
        ))}
      </dl>
    );
  }

  const validate = (): boolean => {
    const next: FormErrors = {};
    for (const field of FIELDS) {
      if (!form[field.name].trim()) next[field.name] = t(field.requiredKey);
    }
    if (!next.cuit && !isValidCuit(normalizeTaxId(form.cuit))) {
      next.cuit = t('settings.validation.cuitInvalid');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const updated = await saveOrganizationProfile(form);
      setForm(toForm(updated));
      setState({ status: 'ready', profile: updated, canEdit });
      setSaved(true);
    } catch (error) {
      const serverErrors = error instanceof ApiRequestError ? error.fieldErrors : undefined;
      const next: FormErrors = {};
      const unmapped: string[] = [];
      for (const [key, message] of Object.entries(serverErrors ?? {})) {
        const field = FIELDS.find((candidate) => candidate.name === key);
        if (field) {
          next[field.name] =
            field.name === 'cuit' ? t('settings.validation.cuitInvalid') : t(field.requiredKey);
        } else {
          unmapped.push(message);
        }
      }
      if (unmapped.length > 0 || Object.keys(next).length === 0) {
        next.general = [t('settings.saveError'), ...unmapped].join(' ');
      }
      setErrors(next);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
        data-testid="organization-profile-form"
        noValidate
      >
        {!profile && notConfigured}
        {saved && (
          <Alert type="success" icon="✓" role="status" onClose={() => setSaved(false)}>
            {t('settings.saved')}
          </Alert>
        )}
        {errors.general && (
          <Alert
            type="error"
            icon="⚠️"
            onClose={() => setErrors({ ...errors, general: undefined })}
          >
            {errors.general}
          </Alert>
        )}

        {FIELDS.map((field) => (
          <Input
            key={field.name}
            id={`profile-${field.name}`}
            label={t(field.labelKey)}
            value={form[field.name]}
            onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
            error={errors[field.name]}
            required
          />
        ))}

        <div className="flex justify-end border-t border-border-subtle pt-5">
          <Button
            type="submit"
            isLoading={submitting}
            variant="ghost"
            className="action-brand min-h-11 shrink-0 whitespace-nowrap rounded-xl border-2 px-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0"
          >
            {submitting ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </div>
      </form>
      <div className="border-t border-border-subtle pt-8">
        <BrandingSettings />
      </div>
    </div>
  );
}
