/**
 * Workspace Sheets add-on per-file access (`drive.file`).
 * Homepage / card UI must not call SpreadsheetApp until granted.
 */

export type SheetsAddonEvent = {
  sheets?: {
    addonHasFileScopePermission?: boolean;
    id?: string;
    title?: string;
  };
};

/** True when the event says this spreadsheet already granted `drive.file`. */
export function hasFileScopePermission(e?: SheetsAddonEvent | null): boolean {
  return e?.sheets?.addonHasFileScopePermission === true;
}

/**
 * Probe whether SpreadsheetApp can touch the active file.
 * Use only outside homepage card builders (menu / sidebar / triggers).
 */
export function canAccessActiveSpreadsheet(): boolean {
  try {
    if (typeof SpreadsheetApp === "undefined") return false;
    const ss = SpreadsheetApp.getActive();
    if (!ss) return false;
    // Touch a cheap property so missing drive.file throws here.
    ss.getId();
    return true;
  } catch {
    return false;
  }
}
