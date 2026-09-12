import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FieldSelector } from '../../src/components/FieldSelector';
import { orderFields, moveField, retainExpandedFields } from '../../src/utils/fieldDisplay';
import { cloneCompareConfig, compareConfigs, createDefaultCompareConfig, makePersistedConfig, readCompareConfig } from '../../src/utils/compareConfig';
import type { CompareContext, CompareField } from '../../src/types/compare';

export function check() {
  const fields = ['A', 'B', 'C'].map(id => ({ id, name: id, kind: 'text', isPrimary: id === 'A', meta: {} } as CompareField));
  const context: CompareContext = { tableId: 't', viewId: 'v', tableName: 'T', primaryFieldId: 'A', fields, records: [] };
  const base = createDefaultCompareConfig(context);
  const ids = (ordered: CompareField[]) => ordered.map(f => f.id);
  assert.deepEqual(ids(orderFields(fields, [])), ['A', 'B', 'C']);
  assert.deepEqual(ids(orderFields(fields, ['C', 'C', 'deleted', 'A'])), ['C', 'A', 'B']);
  assert.deepEqual(moveField(['A', 'B', 'C'], 'C', 'A'), ['C', 'A', 'B']);
  assert.deepEqual(moveField(['A', 'B', 'C'], 'A', 'C', true), ['B', 'C', 'A']);
  assert.deepEqual(moveField(['A', 'B', 'C'], 'A', 'missing'), ['A', 'B', 'C']);
  const draft = cloneCompareConfig(base);
  draft.fieldOrderIds = ['C', 'A', 'B']; draft.wrappedFieldIds.push('A');
  assert.equal(compareConfigs(base, draft), false);
  assert.deepEqual(base.wrappedFieldIds, [], 'draft edits do not mutate applied config');
  assert.deepEqual(readCompareConfig(makePersistedConfig(draft), context), draft);
  const { fieldOrderIds, wrappedFieldIds, ...legacy } = draft;
  const old = readCompareConfig(legacy, context)!;
  assert.deepEqual(old.fieldOrderIds, []); assert.deepEqual(old.wrappedFieldIds, []);
  for (const malformed of [null, 'A', [1, 'A'], {}]) {
    const result = readCompareConfig({ ...legacy, fieldOrderIds: malformed, wrappedFieldIds: malformed }, context)!;
    assert.deepEqual(result.fieldOrderIds, []); assert.deepEqual(result.wrappedFieldIds, []);
  }
  const clean = readCompareConfig({ ...draft, fieldOrderIds: ['C', 'missing', 'C', 'A'], wrappedFieldIds: ['A', 'A', 'missing'] }, context)!;
  assert.deepEqual(clean.fieldOrderIds, ['C', 'A']); assert.deepEqual(clean.wrappedFieldIds, ['A']);
  assert.deepEqual(ids(orderFields(fields, clean.fieldOrderIds)).filter(id => !clean.hiddenFieldIds.includes(id)), ['C', 'B']);
  clean.hiddenFieldIds = [];
  assert.deepEqual(ids(orderFields(fields, clean.fieldOrderIds)), ['C', 'A', 'B'], 'showing a hidden field preserves position');
  const expanded = new Set(['A', 'B']);
  assert.equal(retainExpandedFields(expanded, ['B', 'A', 'C']), expanded);
  assert.deepEqual([...retainExpandedFields(expanded, ['B'])], ['B']);
  for (const locale of ['en-US', 'zh-CN'] as const) {
    const markup = renderToStaticMarkup(<FieldSelector locale={locale} fields={orderFields(fields, draft.fieldOrderIds)}
      hiddenFieldIds={new Set(['A'])} wrappedFieldIds={new Set(['A'])} disabled
      onToggle={() => {}} onToggleWrap={() => {}} onOrderChange={() => {}} onResetOrder={() => {}}
      onShowAll={() => {}} onHideAll={() => {}} />);
    assert.equal((markup.match(/role="switch"/g) ?? []).length, 3);
    assert.equal((markup.match(/<input[^>]*disabled=""/g) ?? []).length, 6);
    assert.ok(markup.indexOf('data-field-id="C"') < markup.indexOf('data-field-id="A"'));
    assert.match(markup, /aria-live="polite"/); assert.match(markup, /Alt/);
  }
}
