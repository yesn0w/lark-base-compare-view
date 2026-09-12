import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfigController, ConfigWriteQueue, type ConfigIO } from '../../src/utils/configController';
import { createDefaultCompareConfig, readCompareConfig, makePersistedConfig, cloneCompareConfig, compareConfigs } from '../../src/utils/compareConfig';
import { columnWidth } from '../../src/utils/columnWidths';
import { CompareTable } from '../../src/components/CompareTable';
import type { CompareContext } from '../../src/types/compare';

function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
export async function check() {
  const context: CompareContext = { tableId: 't', viewId: 'v', tableName: 'T', primaryFieldId: null, fields: [], records: ['a','b','unselected'].map(id => ({id, title: id})) };
  const base = createDefaultCompareConfig(context); base.selectedRecordIds = ['a','b'];
  const legacy = readCompareConfig({schemaVersion: 1, tableId: 't', viewId: 'v'}, context)!;
  assert.equal(columnWidth(legacy, null), 200); assert.equal(columnWidth(legacy, 'a'), 220);
  const cleaned = readCompareConfig({...base, fieldColumnWidth: 900, recordColumnWidths: {b: 9999, a: 159.7, deleted: 300, unselected: 302.6, invalid: Infinity}}, context)!;
  assert.equal(cleaned.fieldColumnWidth, 420);
  assert.deepEqual(cleaned.recordColumnWidths, {a: 160, b: 800, unselected: 303});
  for (const invalid of [NaN, Infinity, '200', {}, [], null]) assert.equal(readCompareConfig({...base, fieldColumnWidth: invalid}, context)!.fieldColumnWidth, null);
  assert.deepEqual(readCompareConfig({...base, recordColumnWidths: []}, context)!.recordColumnWidths, {});
  const clone = cloneCompareConfig(cleaned); clone.recordColumnWidths.a = 500;
  assert.equal(cleaned.recordColumnWidths.a, 160);
  assert.deepEqual(readCompareConfig(makePersistedConfig(cleaned), context), cleaned);
  assert.equal(compareConfigs(cloneCompareConfig({...base, recordColumnWidths: {b: 400, a: 300}}), cloneCompareConfig({...base, recordColumnWidths: {a: 300, b: 400}})), true);

  let remote = cloneCompareConfig(base), reads = 0, writes = 0, active = 0, peak = 0, failRead = false, failWrite = false;
  let gate: ReturnType<typeof deferred> | null = null;
  const io: ConfigIO = {
    async read() { reads++; if (failRead) throw Error('read'); return makePersistedConfig(remote); },
    async write(data) { active++; peak = Math.max(peak, active); const waiting = gate; gate = null;
      try { if (waiting) await waiting.promise; if (failWrite) throw Error('write'); remote = readCompareConfig(data, context)!; writes++; } finally { active--; } },
  };
  const queue = new ConfigWriteQueue(), model = new ConfigController(context, io, base, queue);
  model.updateDraft(draft => ({...draft, selectedRecordIds: ['b'], wrappedFieldIds: ['field-in-draft']}));
  model.setWidth('a', 320); await model.flushWidths();
  assert.equal(remote.recordColumnWidths.a, 320); assert.deepEqual(remote.selectedRecordIds, ['a','b']);
  assert.deepEqual(model.state.draft.selectedRecordIds, ['b']); assert.equal(model.state.remoteChanged, false);
  assert.equal(model.isDirty, true); model.discard(); assert.equal(model.isDirty, false); assert.equal(model.widths.recordColumnWidths.a, 320);

  const first = deferred(); gate = first;
  model.setWidth('a', 400); await tick(); model.setWidth('a', 500); model.setWidth('b', 600);
  first.resolve(); await model.flushWidths();
  assert.equal(model.widths.recordColumnWidths.a, 500); assert.equal(remote.recordColumnWidths.b, 600); assert.equal(peak, 1);
  failWrite = true; model.setWidth('a', 700); assert.equal(await model.flushWidths(), false);
  assert.equal(model.widths.recordColumnWidths.a, 700); assert.equal(remote.recordColumnWidths.a, 500); assert.equal(model.state.widthError, true);
  model.updateDraft(draft => ({...draft, selectedRecordIds: ['a']}));
  assert.equal(await model.save(), false); assert.deepEqual(remote.selectedRecordIds, ['a','b']);
  model.discard(); assert.equal(model.state.widthError, true); assert.equal(model.widths.recordColumnWidths.a, 700);
  model.restoreWidths(); assert.equal(model.widths.recordColumnWidths.a, 500);
  failWrite = false; model.setWidth('a', null); await model.flushWidths(); assert.equal(remote.recordColumnWidths.a, undefined);
  model.setWidth(null, 350); await model.flushWidths(); model.reset(); assert.equal(model.state.draft.fieldColumnWidth, 350);
  model.discard();
  const before = writes; failRead = true; model.setWidth('a', 450); assert.equal(await model.flushWidths(), false); assert.equal(writes, before);
  failRead = false; await model.flushWidths(); assert.equal(remote.recordColumnWidths.a, 450);
  remote.recordColumnWidths.unselected = 444;
  model.updateDraft(draft => ({...draft, selectedRecordIds: ['b']}));
  assert.equal(await model.save(), true); assert.equal(remote.recordColumnWidths.unselected, 444); assert.deepEqual(remote.selectedRecordIds, ['b']);
  remote.fieldColumnWidth = 380; await model.reload(); assert.equal(model.widths.fieldColumnWidth, 380);

  // Disposal cannot submit results, start another stale patch, or overlap a new source's write.
  const stale = deferred(); gate = stale; model.setWidth('a', 600); await tick(); model.setWidth('b', 700);
  const snapshot = model.state; model.dispose();
  const newModel = new ConfigController(context, io, remote, queue); newModel.setWidth('a', 650);
  stale.resolve(); await newModel.flushWidths(); assert.equal(model.state, snapshot); assert.equal(remote.recordColumnWidths.a, 650); assert.equal(remote.recordColumnWidths.b, 600); assert.equal(peak, 1);
  assert.ok(reads >= writes);
  newModel.updateContext({...context, records: context.records.filter(r => r.id !== 'a')}, io);
  assert.equal(newModel.state.applied.recordColumnWidths.a, undefined);
  newModel.dispose();

  const markup = renderToStaticMarkup(<CompareTable locale="en-US" fields={[{id:'f',name:'F',kind:'text',isPrimary:false,meta:{} as never}]}
    groups={[{key:'all',label:'',records:context.records.slice(0,2)}]} collapsedGroupKeys={new Set()} differingFieldIds={new Set()} pendingRecordIds={new Set()}
    values={{}} rowHeight={32} wrappedFieldIds={new Set()} expandedFieldIds={new Set()} loading
    widths={{fieldColumnWidth: 300, recordColumnWidths:{a:400,b:500}}} onColumnWidthChange={() => {}}
    onToggleFieldExpansion={() => {}} onToggleGroup={() => {}} onRemoveRecord={() => {}} onMoveRecordBefore={() => {}} />);
  assert.match(markup, /width:1200px/); assert.equal((markup.match(/role="separator"/g) ?? []).length, 3);
  const collapsedMarkup = renderToStaticMarkup(<CompareTable locale="en-US" fields={[]}
    groups={[{key:'g',label:'Group',records:context.records}]} collapsedGroupKeys={new Set(['g'])} differingFieldIds={new Set()} pendingRecordIds={new Set()}
    values={{}} rowHeight={32} wrappedFieldIds={new Set()} expandedFieldIds={new Set()} loading={false} disabled
    onToggleFieldExpansion={() => {}} onToggleGroup={() => {}} onRemoveRecord={() => {}} onMoveRecordBefore={() => {}} />);
  assert.match(collapsedMarkup, /Expand group: Group/); assert.doesNotMatch(collapsedMarkup, /disabled=""/);
  assert.match(markup, /aria-valuenow="400"/); assert.match(markup, /aria-valuemax="800"/);
}
