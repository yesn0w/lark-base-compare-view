const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const sourcePath = path.resolve(__dirname, '../src/utils/configAccess.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
  },
  fileName: sourcePath,
}).outputText;
const testModule = new Module(sourcePath, module);
testModule.filename = sourcePath;
testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
testModule._compile(output, sourcePath);

const {
  loadCompareConfigAccess,
  makePersistentDataKey,
  readPersistentDataWithFallback,
  readEditCapability,
  subscribeIfAvailable,
  writePersistentData,
} = testModule.exports;

async function main() {
  const savedData = {
    compareViewConfig: {
      schemaVersion: 1,
      tableId: 'tbl-mobile',
      viewId: 'vew-compare',
      selectedRecordIds: ['rec-a', 'rec-b'],
    },
  };
  let permissionCalls = 0;

  const accessScope = { tableId: 'tbl-mobile', viewId: 'vew-compare' };
  const result = await loadCompareConfigAccess(
    {
      getPersistentData: async () => ({ data: savedData, source: 'keyed' }),
      migratePersistentData: async () => undefined,
      canEditBase: async () => {
        permissionCalls += 1;
        throw new Error('HostNotRegistered');
      },
      isMobileHost: () => true,
    },
    accessScope
  );

  assert.deepEqual(result.data, savedData);
  assert.equal(result.canSave, false);
  assert.equal(result.readOnlyReason, 'mobile');
  assert.equal(permissionCalls, 0);

  const desktopResult = await loadCompareConfigAccess(
    {
      getPersistentData: async () => ({ data: savedData, source: 'keyed' }),
      migratePersistentData: async () => undefined,
      canEditBase: async () => {
        throw new Error('HostNotRegistered');
      },
      isMobileHost: () => false,
    },
    accessScope
  );

  assert.deepEqual(desktopResult.data, savedData);
  assert.equal(desktopResult.canSave, false);
  assert.equal(desktopResult.readOnlyReason, 'permission');

  const scope = { tableId: 'tbl/mobile', viewId: 'vew:compare' };
  assert.equal(
    makePersistentDataKey(scope),
    'compareViewConfig:v1:tbl%2Fmobile:vew%3Acompare'
  );

  let legacyReads = 0;
  const keyedRead = await readPersistentDataWithFallback(
    scope,
    async (key) => ({ key, value: 'saved-on-web' }),
    async () => {
      legacyReads += 1;
      return { value: 'legacy' };
    }
  );
  assert.equal(keyedRead.source, 'keyed');
  assert.equal(keyedRead.data.value, 'saved-on-web');
  assert.equal(legacyReads, 0);

  const legacyRead = await readPersistentDataWithFallback(
    scope,
    async () => undefined,
    async () => ({ value: 'legacy' })
  );
  assert.deepEqual(legacyRead, { data: { value: 'legacy' }, source: 'legacy' });

  const legacyAfterKeyFailure = await readPersistentDataWithFallback(
    scope,
    async () => {
      throw new Error('Keyed storage is unavailable');
    },
    async () => ({ value: 'legacy-after-error' })
  );
  assert.deepEqual(legacyAfterKeyFailure, {
    data: { value: 'legacy-after-error' },
    source: 'legacy',
  });

  let migratedData = null;
  const migratedResult = await loadCompareConfigAccess(
    {
      getPersistentData: async () => ({ data: savedData, source: 'legacy' }),
      canEditBase: async () => true,
      isMobileHost: () => false,
      migratePersistentData: async (_scope, data) => {
        migratedData = data;
      },
    },
    scope
  );
  assert.deepEqual(migratedResult.data, savedData);
  assert.equal(migratedResult.canSave, true);
  assert.equal(migratedResult.readOnlyReason, null);
  assert.deepEqual(migratedData, savedData);

  let emptyMigrationCalls = 0;
  const emptyLegacyResult = await loadCompareConfigAccess(
    {
      getPersistentData: async () => ({ data: undefined, source: 'legacy' }),
      canEditBase: async () => true,
      isMobileHost: () => false,
      migratePersistentData: async () => {
        emptyMigrationCalls += 1;
      },
    },
    scope
  );
  assert.equal(emptyLegacyResult.data, undefined);
  assert.equal(emptyMigrationCalls, 0);

  const unsupportedSubscription = subscribeIfAvailable(() => {
    throw new Error('HostNotRegistered');
  });
  assert.equal(typeof unsupportedSubscription, 'function');
  assert.doesNotThrow(() => unsupportedSubscription());

  let writtenEntry = null;
  await writePersistentData(scope, { value: 'next-save' }, async (key, data) => {
    writtenEntry = { key, data };
  });
  assert.deepEqual(writtenEntry, {
    key: 'compareViewConfig:v1:tbl%2Fmobile:vew%3Acompare',
    data: { value: 'next-save' },
  });
  await assert.rejects(
    () => writePersistentData(scope, { value: 'rejected' }, async () => false),
    /rejected the shared configuration write/
  );

  let fallbackPermissionCalls = 0;
  const editableFromFallback = await readEditCapability(
    async () => {
      throw new Error('HostNotRegistered');
    },
    async () => {
      fallbackPermissionCalls += 1;
      return true;
    }
  );
  assert.equal(editableFromFallback, true);
  assert.equal(fallbackPermissionCalls, 1);
  console.log('Verified mobile hosts can display saved shared configuration without edit APIs.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
