import { translate } from '../i18n';
import type { UiLocale } from '../types/compare';

interface StatBarProps {
  locale: UiLocale;
  recordCount: number;
  fieldCount: number;
  differenceCount: number;
  diffOnly: boolean;
  onToggleDiffOnly: () => void;
}

export function StatBar({
  locale,
  recordCount,
  fieldCount,
  differenceCount,
  diffOnly,
  onToggleDiffOnly,
}: StatBarProps) {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);

  return (
    <div className="stat-bar">
      <span>{t('statRecords', { count: recordCount })}</span>
      <span className="stat-bar__dot" aria-hidden="true">
        ·
      </span>
      <span>{t('statFields', { count: fieldCount })}</span>
      <span className="stat-bar__dot" aria-hidden="true">
        ·
      </span>
      <span className={differenceCount ? 'stat-bar__diff' : undefined}>
        {t('statDifferences', { count: differenceCount })}
      </span>
      <div className="stat-bar__spacer" />
      <button
        type="button"
        className="stat-bar__toggle"
        role="switch"
        aria-checked={diffOnly}
        onClick={onToggleDiffOnly}
      >
        <span className="stat-bar__track" aria-hidden="true">
          <span className="stat-bar__knob" />
        </span>
        <span>{t('diffOnly')}</span>
      </button>
    </div>
  );
}
