import { CONFIG, DIGEST_HANDLER, type ScheduleCadence } from "./config";
import { checkLicenseSync } from "./license";
import { getScheduleCadence, isEmailDigestOptIn, setScheduleCadence } from "./properties";
import { scheduleNeedsPaidMessage } from "./upgrade";

function removeTriggersByHandler(handler: string): void {
  for (const t of ScriptApp.getProjectTriggers()) {
    if (t.getHandlerFunction() === handler) ScriptApp.deleteTrigger(t);
  }
}

/** Install time-driven sync trigger for the selected cadence (paid tier). */
export function installSchedule(cadence?: ScheduleCadence): string {
  const license = checkLicenseSync();
  if (!license.allowSchedule) {
    return scheduleNeedsPaidMessage();
  }
  const chosen = cadence || getScheduleCadence();
  setScheduleCadence(chosen);
  removeTriggersByHandler(CONFIG.SYNC_TRIGGER_HANDLER);

  const builder = ScriptApp.newTrigger(CONFIG.SYNC_TRIGGER_HANDLER).timeBased();
  switch (chosen) {
    case "every_6h":
      builder.everyHours(6).create();
      break;
    case "daily":
      builder.everyDays(1).atHour(6).create();
      break;
    case "weekly":
      builder.everyWeeks(1).onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();
      break;
    case "hourly":
    default:
      builder.everyHours(1).create();
      break;
  }

  if (isEmailDigestOptIn()) {
    installDigestTrigger();
  }

  return `Scheduled refresh set to ${chosen.replace("_", " ")}.`;
}

export function removeSchedule(): string {
  removeTriggersByHandler(CONFIG.SYNC_TRIGGER_HANDLER);
  return "Scheduled refresh removed.";
}

/** True when a time-driven sync trigger is installed. */
export function isScheduleEnabled(): boolean {
  try {
    return ScriptApp.getProjectTriggers().some(
      (t) => t.getHandlerFunction() === CONFIG.SYNC_TRIGGER_HANDLER,
    );
  } catch {
    return false;
  }
}

/**
 * Weekly digest trigger. Requires optional sensitive scope script.send_mail —
 * NOT declared in the default manifest. See README.
 */
export function installDigestTrigger(): string {
  removeTriggersByHandler(DIGEST_HANDLER);
  ScriptApp.newTrigger(DIGEST_HANDLER)
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();
  return "Weekly digest trigger installed (requires script.send_mail scope).";
}

export function removeDigestTrigger(): void {
  removeTriggersByHandler(DIGEST_HANDLER);
}
