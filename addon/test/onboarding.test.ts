import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_STATUS_LEFT,
  progressBarLabel,
  progressPctForSource,
  statusLabel,
  syncingStatusLeft,
  syncingStatusRight,
} from "../src/lib/onboardingCopy";
import { scheduleNeedsPaidMessage } from "../src/lib/upgrade";

describe("onboarding copy helpers", () => {
  it("builds a 28-char progress bar plus percent", () => {
    const label = progressBarLabel(0.5);
    assert.ok(label.startsWith("█".repeat(14) + "░".repeat(14)));
    assert.ok(label.includes("50%"));
  });

  it("uses ~N only when the API reports a total", () => {
    assert.ok(
      syncingStatusLeft({ activeLabel: "Stripe", ordersSoFar: 1240, totalKnown: 3000 }).includes(
        "1,240 OF ~3,000 ORDERS",
      ),
    );
    const soFar = syncingStatusLeft({ activeLabel: "Stripe", ordersSoFar: 1240 });
    assert.ok(soFar.includes("1,240 ORDERS SO FAR"));
    assert.ok(!soFar.includes("~"));
  });

  it("lists done sources on the right status band", () => {
    assert.equal(
      syncingStatusRight({ lastUpdate: "10:02", doneLabels: ["Lemon Squeezy"] }),
      "LAST UPDATE 10:02 · LEMON SQUEEZY DONE",
    );
  });

  it("maps backfill status labels", () => {
    assert.equal(statusLabel("synced"), "● Synced");
    assert.equal(statusLabel("backfilling"), "Backfilling · resumes next sync");
    assert.equal(statusLabel("not_connected"), "Not connected");
    assert.equal(statusLabel("not_imported"), "Not imported");
  });

  it("treats synced as 100% and unknown totals as soft progress", () => {
    assert.equal(progressPctForSource({ label: "Stripe", rows: 10, status: "synced" }), 1);
    assert.equal(progressPctForSource({ label: "CSV", rows: 0, status: "not_imported" }), 0);
    assert.equal(
      progressPctForSource({
        label: "Stripe",
        rows: 500,
        totalKnown: 1000,
        status: "backfilling",
      }),
      0.5,
    );
  });

  it("keeps empty-state copy stable", () => {
    assert.ok(EMPTY_STATUS_LEFT.includes("NOT CONNECTED"));
  });

  it("points schedule upgrade at /pricing", () => {
    const msg = scheduleNeedsPaidMessage();
    assert.ok(msg.includes("Pro or Business"));
    assert.ok(msg.includes("/pricing"));
  });
});
