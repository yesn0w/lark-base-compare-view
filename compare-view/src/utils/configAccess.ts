const PERSISTENT_DATA_KEY_PREFIX = 'compareViewConfig:v1';

export interface PersistentConfigScope {
  tableId: string;
  viewId: string | null;
}

export interface PersistentConfigRead {
  data: unknown;
  source: 'keyed' | 'legacy';
}

export function makePersistentDataKey(scope: PersistentConfigScope): string {
  const tableId = encodeURIComponent(scope.tableId);
  const viewId = encodeURIComponent(scope.viewId ?? 'no-view');
  return `${PERSISTENT_DATA_KEY_PREFIX}:${tableId}:${viewId}`;
}

export async function readPersistentDataWithFallback(
  scope: PersistentConfigScope,
  readKeyed: (key: string) => Promise<unknown>,
  readLegacy: () => Promise<unknown>
): Promise<PersistentConfigRead> {
  try {
    const data = await readKeyed(makePersistentDataKey(scope));
    if (data !== undefined && data !== null) {
      return { data, source: 'keyed' };
    }
  } catch {
    // Older hosts may reject explicit keys. The legacy default remains readable.
  }

  return { data: await readLegacy(), source: 'legacy' };
}

export function subscribeIfAvailable(subscribe: () => () => void): () => void {
  try {
    return subscribe();
  } catch {
    return () => undefined;
  }
}

export async function writePersistentData(
  scope: PersistentConfigScope,
  data: unknown,
  write: (key: string, data: unknown) => Promise<unknown>
): Promise<void> {
  const written = await write(makePersistentDataKey(scope), data);
  if (written === false) {
    throw new Error('The host rejected the shared configuration write.');
  }
}

export async function readEditCapability(
  readPermission: () => Promise<boolean>,
  readEditable: () => Promise<boolean>
): Promise<boolean> {
  try {
    return await readPermission();
  } catch {
    return readEditable();
  }
}

export interface CompareConfigAccessAdapter {
  getPersistentData(scope: PersistentConfigScope): Promise<PersistentConfigRead>;
  migratePersistentData(scope: PersistentConfigScope, data: unknown): Promise<void>;
  canEditBase(): Promise<boolean>;
  isMobileHost(): boolean;
}

export type CompareConfigReadOnlyReason = 'mobile' | 'permission' | null;

export interface CompareConfigAccessResult {
  data: unknown;
  canSave: boolean;
  readOnlyReason: CompareConfigReadOnlyReason;
}

/**
 * Loads the shared payload and its edit capability together. Keeping this
 * orchestration outside React gives host-compatibility behavior a deterministic
 * test seam.
 */
export async function loadCompareConfigAccess(
  adapter: CompareConfigAccessAdapter,
  scope: PersistentConfigScope
): Promise<CompareConfigAccessResult> {
  const persistent = await adapter.getPersistentData(scope);
  const { data } = persistent;
  if (adapter.isMobileHost()) {
    return { data, canSave: false, readOnlyReason: 'mobile' };
  }

  let canSave = false;
  try {
    canSave = await adapter.canEditBase();
  } catch {
    // Some hosts can read shared bridge data without exposing permission APIs.
  }

  if (
    canSave &&
    persistent.source === 'legacy' &&
    data !== undefined &&
    data !== null
  ) {
    try {
      await adapter.migratePersistentData(scope, data);
    } catch {
      // A failed compatibility migration must not hide the readable legacy data.
    }
  }

  return {
    data,
    canSave,
    readOnlyReason: canSave ? null : 'permission',
  };
}
