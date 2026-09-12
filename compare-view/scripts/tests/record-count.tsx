import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecordSelector } from '../../src/components/RecordSelector';
import { createDefaultCompareConfig, makePersistedConfig, readCompareConfig } from '../../src/utils/compareConfig';
import type { CompareContext } from '../../src/types/compare';

export function check() {
  const context: CompareContext = { tableId: 'table', viewId: 'view', tableName: 'Table',
    primaryFieldId: null, fields: [],
    records: Array.from({ length: 100 }, (_, i) => ({ id: `r${i}`, title: `Record ${i}` })) };
  for (const count of [0, 1, 10, 11, 25, 100]) {
    const config = { ...createDefaultCompareConfig(context),
      selectedRecordIds: context.records.slice(0, count).map(r => r.id).reverse() };
    assert.deepEqual(readCompareConfig(makePersistedConfig(config), context), config,
      `${count} records survive the version-1 config round-trip in order`);
  }
  const dirty = { ...createDefaultCompareConfig(context), selectedRecordIds: ['r3', 'deleted', 'r1', 'r3', 'r2'] };
  assert.deepEqual(readCompareConfig(makePersistedConfig(dirty), context)?.selectedRecordIds, ['r3', 'r1', 'r2']);
  assert.equal(readCompareConfig(makePersistedConfig(dirty), { ...context, tableId: 'another' }), null);

  for (const locale of ['en-US', 'zh-CN'] as const) {
    for (const disabled of [false, true]) {
      const markup = renderToStaticMarkup(<RecordSelector
        locale={locale} groups={[{ key: 'all', label: '', records: context.records.slice(0, 11) }]}
        selectedRecordIds={context.records.slice(0, 10).map(r => r.id)} hiddenSelectedCount={0}
        collapsedGroupKeys={new Set()} disabled={disabled}
        onToggle={() => {}} onToggleGroup={() => {}} onClearSelection={() => {}}
      />);
      const boxes = markup.match(/<input\b[^>]*type="checkbox"[^>]*>/g) ?? [];
      assert.equal(boxes.length, 11);
      assert.equal(/disabled/.test(boxes[10]), disabled, 'record 11 is disabled only by permission');
      assert.doesNotMatch(markup, /up to|最多|\/ 10|\/10|\{\{limit\}\}/);
      assert.match(markup, locale === 'en-US' ? /10 selected/ : /已选 10 条/);
    }
  }
}
