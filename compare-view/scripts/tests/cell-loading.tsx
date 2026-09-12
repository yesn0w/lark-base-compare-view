import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompareTable } from '../../src/components/CompareTable';
import { performance } from 'node:perf_hooks';
import { cellSelectionKey, loadCellValuesInBatches, retainCellValues } from '../../src/utils/cellLoading';
import { makeCellKey, makeTextCellValue } from '../../src/utils/cellFormatting';
import { fieldHasDifference, isFieldLoaded } from '../../src/utils/compareDiff';
import type { CellValueMap, CompareField } from '../../src/types/compare';

const fields = Array.from({ length: 20 }, (_, i) => ({ id: `f${i}`, name: `Field ${i}`, kind: 'text' })) as CompareField[];
const records = Array.from({ length: 500 }, (_, i) => `r${i}`);
const tick = () => new Promise(resolve => setImmediate(resolve));

export async function check() {
  let active = true;
  let started = 0;
  const pending: (() => void)[] = [];
  const batches: CellValueMap[] = [];
  const load = loadCellValuesInBatches({ fields: fields.slice(0, 1), recordIds: records.slice(0, 25),
    initialValues: {}, isActive: () => active, onBatch: batch => batches.push(batch),
    readCell: () => { started++; return new Promise(resolve => pending.push(() => resolve(makeTextCellValue('ok')))); }
  });
  assert.equal(started, 12, 'only first batch starts');
  pending.splice(0, 11).forEach(resolve => resolve());
  await tick();
  assert.equal(started, 12, 'waits for the slowest cell in a batch');
  assert.equal(batches.length, 0);
  pending.shift()!();
  await tick();
  assert.equal(batches.length, 1);
  assert.equal(Object.keys(batches[0]).length, 12);
  assert.equal(started, 24);
  active = false;
  pending.splice(0).forEach(resolve => resolve());
  await load;
  assert.equal(started, 24, 'cancelled load never starts the last batch');
  assert.equal(batches.length, 1, 'cancelled batch never publishes stale data');

  const first = { [makeCellKey('f0', 'r0')]: makeTextCellValue('retained') };
  const values: CellValueMap = { ...first };
  let reads = 0;
  await loadCellValuesInBatches({ fields: fields.slice(0, 1), recordIds: records.slice(0, 25),
    initialValues: first, isActive: () => true, onBatch: batch => Object.assign(values, batch),
    readCell: async (_, id) => { reads++; if (id === 'r12') throw new Error('one failed cell'); return makeTextCellValue(id); }
  });
  assert.equal(reads, 24, 'cached cells are not requested again');
  assert.equal(Object.keys(values).length, 25);
  assert.equal(values['f0::r12'].text, '—');
  assert.equal(values['f0::r24'].text, 'r24', 'a failure does not stop later batches');
  assert.equal(values['f0::r0'].text, 'retained');
  assert.deepEqual(retainCellValues(values, fields.slice(0, 1), ['r0']), first);
  assert.equal(cellSelectionKey(['r2', 'r1', 'r2']), cellSelectionKey(['r1', 'r2']));

  for (const [emptyFields, emptyRecords] of [[[], records], [fields, []]] as [CompareField[], string[]][]) {
    await loadCellValuesInBatches({ fields: emptyFields, recordIds: emptyRecords, initialValues: {},
      isActive: () => true, onBatch: () => assert.fail('empty selection publishes nothing'),
      readCell: async () => { assert.fail('empty selection reads nothing'); }
    });
  }
  assert.equal(isFieldLoaded(first, 'f0', ['r0', 'r1']), false);
  assert.equal(fieldHasDifference(first, 'f0', ['r0', 'r1']), false, 'missing is not an empty cell');
  assert.equal(fieldHasDifference({ ...first, 'f0::r1': makeTextCellValue(null) }, 'f0', ['r0', 'r1']), true);

  const markup = renderToStaticMarkup(<CompareTable locale="en-US" fields={fields.slice(0, 1)}
    groups={[{ key: 'all', label: '', records: [{ id: 'r0', title: 'A' }, { id: 'r1', title: 'B' }] }]}
    values={{ 'f0::r0': makeTextCellValue(null) }} rowHeight={32} loading={true}
    collapsedGroupKeys={new Set()} differingFieldIds={new Set()} pendingRecordIds={new Set()}
    wrappedFieldIds={new Set()} expandedFieldIds={new Set()} onToggleFieldExpansion={() => {}}
    onToggleGroup={() => {}} onRemoveRecord={() => {}} onMoveRecordBefore={() => {}}
  />);
  assert.equal((markup.match(/cell-text--loading/g) ?? []).length, 1, 'only the missing cell has a loading placeholder');
  assert.match(markup, />—</, 'a loaded empty cell stays distinguishable');
  assert.match(markup, /Loading…/);

  const start = performance.now();
  let inFlight = 0, peak = 0, count = 0, publications = 0;
  const stress: CellValueMap = {};
  await loadCellValuesInBatches({ fields, recordIds: records, initialValues: {}, isActive: () => true,
    onBatch: batch => { publications++; Object.assign(stress, batch); },
    readCell: async (field, record) => {
      count++; inFlight++; peak = Math.max(peak, inFlight);
      await Promise.resolve(); inFlight--;
      return makeTextCellValue(`${field.id}/${record}`);
    }
  });
  assert.equal(count, 10000);
  assert.equal(Object.keys(stress).length, 10000);
  assert.equal(peak, 12);
  assert.equal(publications, Math.ceil(10000 / 12));
  console.log(`500 records × 20 fields: ${count} cells, peak concurrency ${peak}, ${publications} batches, ${Math.round(performance.now() - start)} ms (mock reads).`);
}
