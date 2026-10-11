/**
 * Resumable, time-boxed sync.
 * - Card "Sync now" runs a ~20s slice (card actions die at ~30s).
 * - If more remains, a one-off time-driven trigger continues in ~4.5 min slices
 *   until done, then deletes itself. Per-store cursors already persist in User
 *   Properties (lib/properties), and each slice merges rows into the data tabs.
 * - LockService (user lock) prevents overlapping slices.
 */
import { clearDeadline, setDeadline } from "./lib/deadline";
import { runSync, type SyncResult } from "./sync";

export const CONTINUE_HANDLER = "continueSyncInBackground";
const CARD_SLICE_MS = 20_000;
const TRIGGER_SLICE_MS = 270_000;
const STATUS_KEY = "RS_BG_SYNC_STATUS";
const SSID_KEY = "RS_BG_SYNC_SSID";

export interface BgStatus {
  state: "running" | "done" | "error";
  records: number;
  message: string;
  updatedAt: string;
  /** True when a continuation trigger could not be created (user can click Continue). */
  needsManualContinue?: boolean;
}

function props(): GoogleAppsScript.Properties.Properties {
  return PropertiesService.getUserProperties();
}

export function getBgStatus(): BgStatus | null {
  try {
    const raw = props().getProperty(STATUS_KEY);
    return raw ? (JSON.parse(raw) as BgStatus) : null;
  } catch {
    return null;
  }
}

function setBgStatus(st: BgStatus): void {
  props().setProperty(STATUS_KEY, JSON.stringify(st));
}

function deleteContinueTriggers(): void {
  for (const t of ScriptApp.getProjectTriggers()) {
    if (t.getHandlerFunction() === CONTINUE_HANDLER) ScriptApp.deleteTrigger(t);
  }
}

/** Returns true when a continuation trigger is in place. */
function scheduleContinuation(): boolean {
  try {
    deleteContinueTriggers();
    ScriptApp.newTrigger(CONTINUE_HANDLER).timeBased().after(60_000).create();
    return true;
  } catch (err) {
    console.warn(`Could not schedule background continuation: ${String(err)}`);
    return false;
  }
}

function runSlice(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  budgetMs: number,
  full: boolean,
): SyncResult & { busy?: boolean } {
  const lock = LockService.getUserLock();
  if (!lock.tryLock(2000)) {
    const st = getBgStatus();
    return {
      ok: true,
      busy: true,
      incomplete: true,
      records: st?.records || 0,
      message: `Sync already running in background… ${st?.records || 0} records so far.`,
      sources: [],
    };
  }
  try {
    setDeadline(budgetMs);
    const r = runSync({ full, ss });
    const records = r.records || 0;
    if (r.incomplete) {
      const scheduled = scheduleContinuation();
      setBgStatus({
        state: "running",
        records,
        message: r.ok ? `Syncing in background… ${records} records so far.` : r.message,
        updatedAt: new Date().toISOString(),
        needsManualContinue: !scheduled,
      });
      return {
        ...r,
        message: scheduled
          ? `Syncing in background… ${records} records so far. Click Refresh to check progress.`
          : `Synced ${records} records so far. Click Continue sync to fetch the rest.`,
      };
    }
    deleteContinueTriggers();
    setBgStatus({ state: r.ok ? "done" : "error", records, message: r.message, updatedAt: new Date().toISOString() });
    return r;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Sync slice failed: ${msg}`);
    setBgStatus({ state: "error", records: getBgStatus()?.records || 0, message: `Sync failed: ${msg}`, updatedAt: new Date().toISOString() });
    throw err;
  } finally {
    clearDeadline();
    lock.releaseLock();
  }
}

/** Card "Sync now" / "Continue sync": one ~20s slice in the active spreadsheet. */
export function startCardSync(full = false): SyncResult & { busy?: boolean } {
  const ss = SpreadsheetApp.getActive();
  props().setProperty(SSID_KEY, ss.getId());
  return runSlice(ss, CARD_SLICE_MS, full);
}

/** Time-driven continuation handler (no active spreadsheet in trigger context). */
export function continueSyncInBackground(): void {
  const id = props().getProperty(SSID_KEY);
  if (!id) {
    deleteContinueTriggers();
    return;
  }
  let ss: GoogleAppsScript.Spreadsheet.Spreadsheet;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (err) {
    deleteContinueTriggers();
    setBgStatus({ state: "error", records: getBgStatus()?.records || 0, message: `Background sync couldn't open the spreadsheet: ${String(err)}`, updatedAt: new Date().toISOString() });
    return;
  }
  try {
    runSlice(ss, TRIGGER_SLICE_MS, false);
  } catch {
    deleteContinueTriggers();
  }
}
