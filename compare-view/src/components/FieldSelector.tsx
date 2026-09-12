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
  const pointer = useRef<{ id: string; startX: number; startY: number; moving: boolean } | null>(null);
  const targetRef = useRef<{ id: string; after: boolean } | null>(null);
  const updateTarget = (next: { id: string; after: boolean } | null) => {
    targetRef.current = next;
    setTarget((current) => current?.id === next?.id && current?.after === next?.after ? current : next);
  };
  const finishDrag = () => { setDraggingId(null); updateTarget(null); pointerY.current = null; pointer.current = null; };

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
          return y <= bounds.bottom;
        }) ?? rows[rows.length - 1];
        if (row) {
          const bounds = row.getBoundingClientRect();
          const next = { id: row.dataset.fieldId!, after: y > (bounds.top + bounds.bottom) / 2 };
          updateTarget(next);
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
      <div className="selector-list field-selector-list" role="group" aria-label={t('fields')} ref={listRef}>
        {fields.map((field, index) => (
          <div className={`selector-list__item field-selector__item${target?.id === field.id && draggingId !== field.id ? ` field-selector__item--${target.after ? 'after' : 'before'}` : ''}`}
            key={field.id} data-field-id={field.id}>
            <button type="button" className="drag-handle field-drag-handle" disabled={disabled}
              aria-label={`${t('dragField')}: ${field.name}`} aria-describedby="field-order-help" title={t('fieldOrderKeyboard')}
              onPointerDown={(event) => {
                if (disabled || event.button !== 0) return;
                event.preventDefault();
                event.currentTarget.focus();
                event.currentTarget.setPointerCapture(event.pointerId);
                pointer.current = { id: field.id, startX: event.clientX, startY: event.clientY, moving: false };
              }}
              onPointerMove={(event) => {
                const state = pointer.current;
                const list = listRef.current;
                if (!state || !list || disabled) return;
                if (!state.moving && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 4) return;
                state.moving = true;
                setDraggingId(state.id);
                const bounds = list.getBoundingClientRect();
                if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top - 32 || event.clientY > bounds.bottom + 32) {
                  pointerY.current = null; updateTarget(null); return;
                }
                const y = Math.max(bounds.top + 1, Math.min(bounds.bottom - 1, event.clientY));
                pointerY.current = y;
                const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-field-id]'));
                const row = rows.find((item) => {
                  const rect = item.getBoundingClientRect();
                  return y <= rect.bottom;
                }) ?? rows[rows.length - 1];
                if (row) {
                  const rect = row.getBoundingClientRect();
                  updateTarget({ id: row.dataset.fieldId!, after: y > (rect.top + rect.bottom) / 2 });
                }
              }}
              onPointerUp={(event) => {
                const state = pointer.current;
                const drop = targetRef.current;
                if (state?.moving && drop) move(state.id, drop.id, drop.after);
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                finishDrag();
              }}
              onPointerCancel={finishDrag}
              onLostPointerCapture={finishDrag}
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
