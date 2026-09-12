import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FieldType } from '@lark-opdev/block-bitable-api';
import { RecordSelector } from '../../src/components/RecordSelector';
import { deriveCandidateRecords, groupRecords } from '../../src/utils/queryEngine';
import { createDefaultCompareConfig } from '../../src/utils/compareConfig';
import { moveSelectedRecordBefore, orderSelectedRecordIdsByRecords } from '../../src/utils/compareState';
import type { CompareContext } from '../../src/types/compare';

export function check() {
  const context: CompareContext = {
    tableId: 'table', viewId: 'view', tableName: 'Table', primaryFieldId: 'title',
    fields: [{ id: 'title', name: 'Title', isPrimary: true, kind: 'text',
      meta: { id: 'title', name: 'Title', type: FieldType.Text } }],
    records: ['A', 'B', 'C'].map(id => ({ id, title: id }))
  };
  const defaults = createDefaultCompareConfig(context);
  const values = { title: { A: 'two', B: 'one', C: 'two' } };
  for (const selection of [[], ['C'], ['C', 'A'], ['A'], ['A', 'C'], ['C', 'B', 'A']]) {
    const draft = { ...defaults, selectedRecordIds: selection };
    const candidates = deriveCandidateRecords(context, draft, values, 'en-US', true);
    assert.deepEqual(candidates.map(r => r.id), ['A', 'B', 'C'], 'selection never reorders candidates');
    assert.deepEqual(draft.selectedRecordIds, selection, 'candidate derivation does not modify selection');
    const groups = groupRecords(candidates, context.fields, 'title', values);
    assert.deepEqual(groups.map(g => g.records.map(r => r.id)), [['A', 'C'], ['B']]);
    const filtered = { ...draft, filters: { conjunction: 'and' as const, rules: [
      { id: 'filter', fieldId: 'title', operator: 'is' as const, value: ['two'] }
    ] } };
    assert.deepEqual(deriveCandidateRecords(context, filtered, values, 'en-US', true).map(r => r.id), ['A', 'C']);
    assert.deepEqual(deriveCandidateRecords(context, filtered, {}, 'en-US', false).map(r => r.id), ['A', 'B', 'C']);
  }
  const sorted = deriveCandidateRecords(context, { ...defaults, sortRules: [
    { id: 'sort', fieldId: 'title', direction: 'asc' }
  ] }, values, 'en-US', true);
  assert.deepEqual(sorted.map(r => r.id), ['B', 'A', 'C'], 'explicit sort remains stable for equal values');
  assert.deepEqual(moveSelectedRecordBefore(['C', 'A', 'B'], 'B', 'C'), ['B', 'C', 'A']);
  assert.deepEqual(orderSelectedRecordIdsByRecords(['C', 'A', 'B'], sorted.map(r => r.id)), ['B', 'A', 'C']);
  assert.deepEqual(context.records.map(r => r.id), ['A', 'B', 'C']);

  const markup = renderToStaticMarkup(<RecordSelector
    locale="en-US" groups={[{ key: 'all', label: '', records: context.records }]}
    selectedRecordIds={['C', 'A']} hiddenSelectedCount={0} collapsedGroupKeys={new Set()}
    onToggle={() => {}} onToggleGroup={() => {}} onClearSelection={() => {}}
  />);
  assert.doesNotMatch(markup, /draggable|drag-handle|drop-target/);
  assert.ok(markup.indexOf('title="A"') < markup.indexOf('title="B"'));
  assert.ok(markup.indexOf('title="B"') < markup.indexOf('title="C"'));
}
