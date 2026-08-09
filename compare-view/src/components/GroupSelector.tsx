import { translate } from '../i18n';
import type { CompareField, UiLocale } from '../types/compare';

interface GroupSelectorProps {
  locale: UiLocale;
  fields: CompareField[];
  groupFieldId: string | null;
  disabled?: boolean;
  onChange: (groupFieldId: string | null) => void;
}

export function GroupSelector({
  locale,
  fields,
  groupFieldId,
  disabled = false,
  onChange,
}: GroupSelectorProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <section className="query-panel query-panel--compact" aria-labelledby="group-selector-title">
      <div className="query-panel__heading">
        <div>
          <h2 id="group-selector-title">{t('group')}</h2>
          <p>{t('groupHint')}</p>
        </div>
      </div>
      <select
        aria-label={t('groupField')}
        value={groupFieldId ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{t('noGroup')}</option>
        {fields.map((field) => (
          <option key={field.id} value={field.id}>
            {field.name}
          </option>
        ))}
      </select>
    </section>
  );
}
