import type { CompareFieldKind } from '../types/compare';

const GLYPH_PATHS: Record<CompareFieldKind, string> = {
  text: 'M2.6 3.4h10.8v1.2H2.6V3.4Zm0 3.4h10.8V8H2.6V6.8Zm0 3.4h6.6v1.2H2.6v-1.2Z',
  select:
    'M8 2.4a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2Zm0 1.2a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm0 1.9a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z',
  number:
    'M6.1 2.6h1.2l-.5 3h2.05l.5-3h1.2l-.5 3h2.35v1.2h-2.55l-.4 2.4h2.45v1.2h-2.65l-.5 3h-1.2l.5-3H5.9l-.5 3H4.2l.5-3H2.4V9.4h2.5l.4-2.4H2.9V5.8h2.6l.6-3.2Zm-.2 4.4-.4 2.4h2.05l.4-2.4H5.9Z',
  date: 'M5 2.2v1.1h6V2.2h1.2v1.1h1.4v10.5H2.4V3.3h1.4V2.2H5ZM3.6 6.4v6.2h8.8V6.4H3.6Zm1.5 1.4h2v2h-2v-2Z',
  checkbox:
    'M3.2 2.6h9.6c.33 0 .6.27.6.6v9.6a.6.6 0 0 1-.6.6H3.2a.6.6 0 0 1-.6-.6V3.2c0-.33.27-.6.6-.6Zm.65 1.25v8.3h8.3v-8.3h-8.3ZM7.2 10.3 4.9 8l.85-.85L7.2 8.6l3.05-3.05.85.85L7.2 10.3Z',
  attachment:
    'M10.9 2.4a3 3 0 0 1 2.1 5.12l-5.65 5.65a3.7 3.7 0 0 1-5.23-5.23l5.3-5.3.85.85-5.3 5.3a2.5 2.5 0 0 0 3.53 3.53l5.65-5.65a1.8 1.8 0 0 0-2.55-2.55L4.3 9.42a1.1 1.1 0 0 0 1.56 1.56l4.95-4.95.85.85-4.95 4.95a2.3 2.3 0 0 1-3.26-3.26l5.3-5.3a3 3 0 0 1 2.15-.87Z',
};

export function FieldKindIcon({ kind }: { kind: CompareFieldKind }) {
  return (
    <svg className="field-kind-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={GLYPH_PATHS[kind]} />
    </svg>
  );
}
