import { useEffect, useRef, useState } from 'react';
import { translate } from '../i18n';
import type { UiLocale } from '../types/compare';

interface FilterValuePickerProps {
  locale: UiLocale;
  label: string;
  options: string[];
  value: string[];
  disabled?: boolean;
  onChange: (value: string[]) => void;
}

/**
 * Option picker for select-like filter fields. Every choice field accepts more
 * than one value, matching the host's own filter popover; a native
 * `<select multiple>` needs modifier-clicks and does not look like the host.
 */
export function FilterValuePicker({
  locale,
  label,
  options,
  value,
  disabled = false,
  onChange,
}: FilterValuePickerProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return () => undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  const toggleOption = (option: string) => {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };

  const summary = value.length
    ? value.join(locale === 'zh-CN' ? '、' : ', ')
    : t('filterSelectValue');

  return (
    <div
      className="value-picker"
      ref={rootRef}
      // Keep Escape from also dismissing the surrounding filter popover.
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={`value-picker__trigger${value.length ? '' : ' value-picker__trigger--empty'}`}
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span title={value.length ? summary : undefined}>{summary}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M4.2 6.1 8 9.9l3.8-3.8-.9-.9L8 8.1 5.1 5.2l-.9.9Z" />
        </svg>
      </button>

      {open ? (
        <div className="value-picker__panel" role="group" aria-label={label}>
          {options.length ? (
            options.map((option) => (
              <label className="value-picker__option" key={option}>
                <input
                  type="checkbox"
                  checked={value.includes(option)}
                  onChange={() => toggleOption(option)}
                />
                <span title={option}>{option}</span>
              </label>
            ))
          ) : (
            <p className="value-picker__empty">{t('filterNoOptions')}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
