import { translate } from '../i18n';
import type { UiLocale } from '../types/compare';

interface TableSkeletonProps {
  locale: UiLocale;
  columnCount: number;
  rowCount?: number;
}

/** Deterministic widths keep the placeholder from flickering between renders. */
const HEAD_WIDTHS = ['72px', '54px', '86px', '60px', '78px', '48px'];
const CELL_WIDTHS = ['132px', '96px', '148px', '110px', '124px', '88px'];

export function TableSkeleton({ locale, columnCount, rowCount = 6 }: TableSkeletonProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const columns = Math.max(columnCount, 1);

  return (
    <div className="table-skeleton" aria-live="polite" aria-busy="true">
      <p className="table-skeleton__status">{t('loading')}</p>
      {Array.from({ length: rowCount }, (unused, rowIndex) => (
        <div
          className="table-skeleton__row"
          key={rowIndex}
          style={{ gridTemplateColumns: `var(--field-column-width) repeat(${columns}, minmax(200px, 1fr))` }}
        >
          <div className="table-skeleton__cell">
            <span style={{ width: HEAD_WIDTHS[rowIndex % HEAD_WIDTHS.length] }} />
          </div>
          {Array.from({ length: columns }, (unusedCell, columnIndex) => (
            <div className="table-skeleton__cell" key={columnIndex}>
              <span
                style={{
                  width: CELL_WIDTHS[(rowIndex + columnIndex) % CELL_WIDTHS.length],
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
