import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { FIELD_WIDTH, RECORD_WIDTH } from '../utils/columnWidths';

interface Props {
  label: string;
  value: number;
  record: boolean;
  disabled: boolean;
  onPreview: (value: number | undefined) => void;
  onCommit: (value: number | null) => void;
}

export function ColumnResizer(props: Props) {
  const latest = useRef(props); latest.current = props;
  const range = props.record ? RECORD_WIDTH : FIELD_WIDTH;
  const gesture = useRef<{ start: number; value: number; x: number; pointer?: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const element = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);
  const finish = (commit: boolean) => {
    clearTimeout(timer.current);
    const state = gesture.current;
    gesture.current = null; setActive(false);
    if (state && commit && state.value !== state.start) latest.current.onCommit(state.value);
    latest.current.onPreview(undefined);
    if (state?.pointer !== undefined && element.current?.hasPointerCapture(state.pointer)) element.current.releasePointerCapture(state.pointer);
  };
  useEffect(() => () => { clearTimeout(timer.current); }, []);
  useEffect(() => { if (props.disabled && gesture.current) finish(false); }, [props.disabled]);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape' && gesture.current) { event.preventDefault(); finish(false); } };
    document.addEventListener('keydown', cancel);
    return () => document.removeEventListener('keydown', cancel);
  }, []);
  const move = (width: number) => {
    if (!gesture.current) return;
    gesture.current.value = Math.round(Math.max(range.min, Math.min(range.max, width)));
    latest.current.onPreview(gesture.current.value);
  };
  const start = (event: PointerEvent<HTMLSpanElement>) => {
    if (props.disabled || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    if (gesture.current) finish(true);
    event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { start: props.value, value: props.value, x: event.clientX, pointer: event.pointerId };
    setActive(true);
  };
  if (props.disabled) return null;
  return <span ref={element} className="compare-table__resizer" role="separator" aria-orientation="vertical"
    aria-label={props.label} aria-valuenow={props.value} aria-valuemin={range.min} aria-valuemax={range.max}
    tabIndex={0} title={`${props.label}: ${props.value}px`} onPointerDown={start}
    onPointerMove={event => { const state = gesture.current; if (state?.pointer === event.pointerId) move(state.start + event.clientX - state.x); }}
    onPointerUp={event => { event.stopPropagation(); if (gesture.current?.pointer === event.pointerId) finish(true); }}
    onPointerCancel={() => finish(false)} onLostPointerCapture={() => { if (gesture.current?.pointer !== undefined) finish(false); }}
    onDoubleClick={event => { event.preventDefault(); event.stopPropagation(); finish(false); props.onCommit(null); }}
    onClick={event => event.stopPropagation()} onDragStart={event => event.preventDefault()}
    onBlur={() => { if (gesture.current?.pointer === undefined) finish(true); }}
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'Escape'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if (event.key === 'Escape') { finish(false); return; }
      if (event.key === 'Home') { finish(false); props.onCommit(null); return; }
      if (gesture.current?.pointer !== undefined) return;
      if (!gesture.current) gesture.current = { start: props.value, value: props.value, x: 0 };
      setActive(true);
      move(gesture.current.value + (event.key === 'ArrowLeft' ? -16 : 16));
      clearTimeout(timer.current); timer.current = setTimeout(() => finish(true), 300);
    }}>
    {active ? <span className="column-width-value" role="status">{props.value}px</span> : null}
  </span>;
}
