import { translate } from '../i18n';
import type { CompareField, UiLocale } from '../types/compare';

interface FieldSelectorProps {
  locale: UiLocale;
  fields: CompareField[];
  hiddenFieldIds: Set<string>;
  disabled?: boolean;
  onToggle: (fieldId: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export function FieldSelector({
  locale,
  fields,
  hiddenFieldIds,
  disabled = false,
  onToggle,
  onShowAll,
  onHideAll,
}: FieldSelectorProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <section className="control-panel" aria-labelledby="field-selector-title">
      <div className="control-panel__heading">
        <h2 id="field-selector-title">{t('fields')}</h2>
        <p>{t('fieldsHint')}</p>
      </div>

      <div className="field-actions">
        <button type="button" className="text-button" disabled={disabled} onClick={onShowAll}>
          {t('showAll')}
        </button>
        <button type="button" className="text-button" disabled={disabled} onClick={onHideAll}>
          {t('hideAll')}
        </button>
      </div>

      <div className="selector-list" role="group" aria-label={t('fields')}>
        {fields.map((field) => (
          <label className="selector-list__item" key={field.id}>
            <input
              type="checkbox"
              checked={!hiddenFieldIds.has(field.id)}
              disabled={disabled}
              onChange={() => onToggle(field.id)}
            />
            <span>{field.name}</span>
            {field.isPrimary ? (
              <small className="field-tag">{t('primaryField')}</small>
            ) : null}
          </label>
        ))}
      </div>
    </section>
  );
}
