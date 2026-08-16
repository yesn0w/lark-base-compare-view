import { useEffect, useRef } from 'react';
import { translate } from '../i18n';
import type { UiLocale } from '../types/compare';

interface CellExpandDialogProps {
  locale: UiLocale;
  title: string;
  value: string;
  onClose: () => void;
}

/**
 * Read-only overlay for a cell whose value is clipped in the grid. It never
 * offers editing: Compare View does not write Base data.
 */
export function CellExpandDialog({ locale, title, value, onClose }: CellExpandDialogProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="cell-dialog-backdrop" onClick={onClose}>
      <div
        className="cell-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('cellContent')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cell-dialog__header">
          <span className="cell-dialog__title" title={title}>
            {title}
          </span>
          <button
            type="button"
            className="icon-button"
            ref={closeRef}
            aria-label={t('close')}
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="m8 7.1 3.1-3.1.9.9L8.9 8l3.1 3.1-.9.9L8 8.9 4.9 12l-.9-.9L7.1 8 4 4.9l.9-.9L8 7.1Z" />
            </svg>
          </button>
        </div>
        <p className="cell-dialog__body">{value}</p>
      </div>
    </div>
  );
}
