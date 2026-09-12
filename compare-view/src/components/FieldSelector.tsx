import { useEffect, useRef, useState } from 'react';
import { translate } from '../i18n';
import type { CompareField, UiLocale } from '../types/compare';
import { moveField } from '../utils/fieldDisplay';

interface FieldSelectorProps {
  locale: UiLocale;
  fields: CompareField[];
  hiddenFieldIds: Set<string>;
  wrappedFieldIds: Set<string>;
  disabled?: boolean;
  onToggle: (fieldId: string) => void;
  onToggleWrap: (fieldId: string) => void;
  onOrderChange: (ids: string[]) => void;
  onResetOrder: () => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export function FieldSelector({
  locale, fields, hiddenFieldIds, wrappedFieldIds, disabled = false,
  onToggle, onToggleWrap, onOrderChange, onResetOrder, onShowAll, onHideAll,
}: FieldSelectorProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [target, setTarget] = useState<{ id: string; after: boolean } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const pointerY = useRef<number | null>(null);
  const finishDrag = () => { setDraggingId(null); setTarget(null); pointerY.current = null; };

  useEffect(() => {
    if (!draggingId || disabled) return;
    let frame: number;
    const scroll = () => {
      const list = listRef.current;
      if (list && pointerY.current !== null) {
        const rect = list.getBoundingClientRect();
        const y = pointerY.current;
        const delta = y < rect.top + 32 ? -6 : y > rect.bottom - 32 ? 6 : 0;
        list.scrollTop += delta;
        // Recompute the insertion target as content scrolls under a stationary pointer.
        const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-field-id]'));
        const row = rows.find((item) => {
          const bounds = item.getBoundingClientRect();
          return y >= bounds.top && y <= bounds.bottom;
        });
        if (row) {
          const bounds = row.getBoundingClientRect();
          const next = { id: row.dataset.fieldId!, after: y > (bounds.top + bounds.bottom) / 2 };
          setTarget((current) => current?.id === next.id && current.after === next.after ? current : next);
        }
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [draggingId, disabled]);

  useEffect(() => { if (disabled) finishDrag(); }, [disabled]);

  const move = (id: string, targetId: string, after: boolean) => {
    if (disabled) return;
    const ids = fields.map((field) => field.id);
    const next = moveField(ids, id, targetId, after);
    if (next === ids) return;
    onOrderChange(next);
    setAnnouncement(translate(locale, 'fieldMoved', {
      name: fields.find((field) => field.id === id)?.name ?? '',
      position: next.indexOf(id) + 1, count: next.length,
    }));
  };

  return (
    <section className="control-panel" aria-labelledby="field-selector-title">
      <div className="control-panel__heading">
        <h2 id="field-selector-title">{t('fields')}</h2>
        <p>{t('fieldsHint')}</p>
      </div>
      <div className="field-actions">
        <button type="button" className="text-button" disabled={disabled} onClick={onShowAll}>{t('showAll')}</button>
        <button type="button" className="text-button" disabled={disabled} onClick={onHideAll}>{t('hideAll')}</button>
        <button type="button" className="text-button" disabled={disabled} onClick={onResetOrder}>{t('resetFieldOrder')}</button>
      </div>
      <p className="sr-only" id="field-order-help">{t('fieldOrderKeyboard')}</p>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <div className="selector-list field-selector-list" role="group" aria-label={t('fields')} ref={listRef}
        onDragOver={(event) => {
          if (!draggingId || disabled) return;
          event.preventDefault(); event.dataTransfer.dropEffect = 'move'; pointerY.current = event.clientY;
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            pointerY.current = null; setTarget(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (draggingId && target && !disabled) move(draggingId, target.id, target.after);
          finishDrag();
        }}>
        {fields.map((field, index) => (
          <div className={`selector-list__item field-selector__item${target?.id === field.id && draggingId !== field.id ? ` field-selector__item--${target.after ? 'after' : 'before'}` : ''}`}
            key={field.id} data-field-id={field.id}
            onDragOver={(event) => {
              if (!draggingId || disabled) return;
              const rect = event.currentTarget.getBoundingClientRect();
              setTarget({ id: field.id, after: event.clientY > (rect.top + rect.bottom) / 2 });
            }}>
            <button type="button" className="drag-handle" draggable={!disabled} disabled={disabled}
              aria-label={`${t('dragField')}: ${field.name}`} aria-describedby="field-order-help" title={t('fieldOrderKeyboard')}
              onDragStart={(event) => {
                if (disabled) { event.preventDefault(); return; }
                event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', field.id);
                setDraggingId(field.id);
              }} onDragEnd={finishDrag}
              onKeyDown={(event) => {
                if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
                event.preventDefault();
                const nextIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
                if (fields[nextIndex]) move(field.id, fields[nextIndex].id, nextIndex > index);
              }}>⠿</button>
            <label className="field-selector__label">
              <input type="checkbox" checked={!hiddenFieldIds.has(field.id)} disabled={disabled} onChange={() => onToggle(field.id)} />
              <span title={field.name}>{field.name}</span>
              {field.isPrimary ? <small className="field-tag">{t('primaryField')}</small> : null}
            </label>
            <label className="field-selector__wrap">
              <input type="checkbox" role="switch" aria-label={`${t('wrapField')}: ${field.name}`}
                checked={wrappedFieldIds.has(field.id)} disabled={disabled} onChange={() => onToggleWrap(field.id)} />
              <span>{t('wrapField')}</span>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}
