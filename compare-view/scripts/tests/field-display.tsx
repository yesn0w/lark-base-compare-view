import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompareTable } from '../../src/components/CompareTable';
import type { CompareField, CompareFieldKind, CellValueMap } from '../../src/types/compare';
import { makeCellKey } from '../../src/utils/cellFormatting';
import { fieldHasDifference } from '../../src/utils/compareDiff';
import { cellSelectionKey } from '../../src/utils/cellLoading';

export function check() {
  const kinds: CompareFieldKind[] = ['text', 'select', 'number', 'date', 'checkbox', 'attachment'];
  const fields = kinds.map((kind, i) => ({ id: `f${i}`, name: `Field ${i}`, isPrimary: i === 0, kind, meta: {} } as CompareField));
  const text = '中文换行\nhttps://example.invalid/' + 'longvalue'.repeat(10);
  const values: CellValueMap = {};
  for (const field of fields) for (const id of ['a', 'b']) values[makeCellKey(field.id, id)] = {
    text: id === 'a' ? text : '—', attachments: field.kind === 'attachment' && id === 'a' ? [
      {name: 'failed-long-file-name.pdf', mimeType: 'application/pdf', thumbnailUrl: null},
    ] : [],
  };
  const props = {
    fields, values, locale: 'en-US' as const, groups: [{key: 'all', label: '', records: [{id: 'a', title: 'A'}, {id: 'b', title: 'B'}]}],
    collapsedGroupKeys: new Set<string>(), differingFieldIds: new Set<string>(), pendingRecordIds: new Set<string>(),
    rowHeight: 32 as const, loading: false, disabled: true,
    onToggleGroup() {}, onRemoveRecord() {}, onMoveRecordBefore() {}, onToggleFieldExpansion() {},
  };
  const collapsed = renderToStaticMarkup(<CompareTable {...props} wrappedFieldIds={new Set()} expandedFieldIds={new Set()} />);
  assert.equal((collapsed.match(/class="link-button cell-expand"/g) ?? []).length, 5, 'all non-attachment long text has an entry');
  assert.doesNotMatch(collapsed, /class="link-button cell-expand"[^>]*disabled/);
  const expanded = renderToStaticMarkup(<CompareTable {...props} wrappedFieldIds={new Set(['f1','f2','f3','f4','f5'])} expandedFieldIds={new Set(['f0'])} />);
  assert.equal((expanded.match(/compare-table__row--wrapped/g) ?? []).length, 6, 'all field kinds can wrap');
  assert.equal((expanded.match(/row-collapse/g) ?? []).length, 1);
  assert.doesNotMatch(expanded, /cell-expand|role="dialog"|cell-dialog/);
  assert.match(expanded, /failed-long-file-name.pdf/);
  assert.match(expanded, /中文换行\nhttps:/);
  assert.equal(fieldHasDifference(values, 'f0', ['a', 'b']), true);
  assert.equal(cellSelectionKey(fields.map(f=>f.id)), cellSelectionKey(fields.map(f=>f.id).reverse()), 'field ordering keeps the same load key');
  const many = renderToStaticMarkup(<CompareTable {...props} wrappedFieldIds={new Set()} expandedFieldIds={new Set(['f0','f1'])} />);
  assert.equal((many.match(/row-collapse/g) ?? []).length, 2, 'multiple rows can expand');
}
