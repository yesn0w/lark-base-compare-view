import type { CompareContext, CompareViewConfig } from '../types/compare';
import { cloneCompareConfig, compareConfigs, createDefaultCompareConfig, makePersistedConfig, readCompareConfig } from './compareConfig';
import { normalizeWidth, patchWidths, withWidths, type ColumnId } from './columnWidths';

export interface ConfigIO {
  read(): Promise<unknown>;
  write(data: Record<string, unknown>): Promise<void>;
}

/** One queue is retained across sources; even an old in-flight write must finish first. */
export class ConfigWriteQueue {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(operation);
    this.tail = next.catch(() => undefined);
    return next;
  }
}

export interface ConfigSnapshot {
  applied: CompareViewConfig;
  draft: CompareViewConfig;
  saving: boolean;
  remoteChanged: boolean;
  error: string | null;
  widthSaving: boolean;
  widthError: boolean;
  pendingWidths: Map<ColumnId, number | null>;
}

/** Owns shared settings, isolated drafts and optimistic width patches, without React or SDK access. */
export class ConfigController {
  state: ConfigSnapshot;
  private active = true;
  private widthJob: Promise<boolean> | null = null;
  private revisions = new Map<ColumnId, number>();
  private revision = 0;
  private listeners = new Set<() => void>();

  constructor(private context: CompareContext, private io: ConfigIO, config: CompareViewConfig,
    private queue: ConfigWriteQueue) {
    this.state = { applied: cloneCompareConfig(config), draft: cloneCompareConfig(config), saving: false,
      remoteChanged: false, error: null, widthSaving: false, widthError: false, pendingWidths: new Map() };
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  dispose() { this.active = false; this.listeners.clear(); }
  private publish(patch: Partial<ConfigSnapshot>) {
    if (!this.active) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private read(raw: unknown, context = this.context) {
    return readCompareConfig(raw, context) ?? createDefaultCompareConfig(context);
  }
  updateContext(context: CompareContext, io: ConfigIO) {
    this.context = context; this.io = io;
    const pendingWidths = new Map([...this.state.pendingWidths].filter(([id]) => id === null || context.records.some(r => r.id === id)));
    this.publish({ applied: this.read(this.state.applied), draft: this.read(this.state.draft), pendingWidths });
  }
  get isDirty() { return !compareConfigs(withWidths(this.state.draft, this.state.applied), this.state.applied); }
  get widths() { return patchWidths(this.state.applied, this.state.pendingWidths); }
  updateDraft(updater: (draft: CompareViewConfig) => CompareViewConfig) {
    if (!this.state.saving) this.publish({ draft: withWidths(updater(cloneCompareConfig(this.state.draft)), this.state.applied) });
  }
  discard() { this.publish({ draft: cloneCompareConfig(this.state.applied), remoteChanged: false, error: null }); }
  reset() { this.publish({ draft: withWidths(createDefaultCompareConfig(this.context), this.state.applied), remoteChanged: false }); }
  private acceptRemote(remote: CompareViewConfig) {
    const dirty = this.isDirty;
    const draft = withWidths(this.state.draft, remote);
    const matches = compareConfigs(draft, remote);
    const otherSettingsChanged = !compareConfigs(withWidths(this.state.applied, remote), remote);
    this.publish({ applied: cloneCompareConfig(remote), draft: !dirty || matches ? cloneCompareConfig(remote) : draft,
      remoteChanged: dirty && !matches && (otherSettingsChanged || this.state.remoteChanged), error: null });
  }
  reload() {
    const io = this.io, context = this.context;
    return this.queue.run(async () => {
      if (!this.active) return;
      try { const raw = await io.read(); if (this.active) this.acceptRemote(this.read(raw, context)); }
      catch { this.publish({ error: 'Unable to refresh shared configuration.' }); }
    });
  }
  setWidth(id: ColumnId, value: number | null) {
    if (!this.active || this.state.saving) return;
    if (id !== null && !this.context.records.some(record => record.id === id)) return;
    const width = normalizeWidth(value, id !== null);
    const pendingWidths = new Map(this.state.pendingWidths).set(id, width);
    this.revisions.set(id, ++this.revision);
    this.publish({ pendingWidths, widthError: false });
    void this.flushWidths();
  }
  restoreWidths() {
    // Do not pretend to cancel a write the host has already accepted.
    if (this.state.widthSaving) return;
    this.revisions.clear();
    this.publish({ pendingWidths: new Map(), widthError: false });
  }
  flushWidths(): Promise<boolean> {
    if (this.widthJob) return this.widthJob;
    if (!this.active || !this.state.pendingWidths.size) return Promise.resolve(this.active);
    this.publish({ widthSaving: true, widthError: false });
    const io = this.io, context = this.context;
    this.widthJob = this.queue.run(async () => {
      while (this.active && this.state.pendingWidths.size) {
        const patch = new Map(this.state.pendingWidths), revisions = new Map(this.revisions);
        try {
          const raw = await io.read();
          if (!this.active) return false;
          const next = this.read(patchWidths(this.read(raw, context), patch));
          await io.write(makePersistedConfig(next));
          if (!this.active) return false;
          this.acceptRemote(next);
          const remaining = new Map(this.state.pendingWidths);
          for (const id of patch.keys()) if (this.revisions.get(id) === revisions.get(id)) remaining.delete(id);
          this.publish({ pendingWidths: remaining });
        } catch {
          this.publish({ widthError: true });
          return false;
        }
      }
      return this.active;
    }).finally(() => { this.widthJob = null; this.publish({ widthSaving: false }); });
    return this.widthJob;
  }
  async save(): Promise<boolean> {
    if (!this.active || this.state.saving) return false;
    const draft = cloneCompareConfig(this.state.draft);
    this.publish({ saving: true, error: null });
    if (!await this.flushWidths()) { this.publish({ saving: false }); return false; }
    const io = this.io, context = this.context;
    return this.queue.run(async () => {
      try {
        if (!this.active) return false;
        const raw = await io.read();
        if (!this.active) return false;
        const next = this.read(withWidths(draft, this.read(raw, context)));
        await io.write(makePersistedConfig(next));
        this.publish({ applied: cloneCompareConfig(next), draft: cloneCompareConfig(next), remoteChanged: false, error: null });
        return this.active;
      } catch { this.publish({ error: 'Unable to save shared configuration.' }); return false; }
      finally { this.publish({ saving: false }); }
    });
  }
}
