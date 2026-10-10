import { describe, expect, it } from "vitest";
import {
  launchListUnsubscribeHeaders,
  launchUnsubscribeToken,
  launchUnsubscribeUrl,
  verifyLaunchUnsubscribeToken,
} from "@/lib/launch-email";

describe("launch-list unsubscribe", () => {
  it("signs and verifies a token for an email", () => {
    const email = "Owner@Example.com";
    const token = launchUnsubscribeToken(email);
    expect(verifyLaunchUnsubscribeToken("owner@example.com", token)).toBe(true);
    expect(verifyLaunchUnsubscribeToken("other@example.com", token)).toBe(false);
  });

  it("builds List-Unsubscribe headers with one-click POST", () => {
    const headers = launchListUnsubscribeHeaders("a@b.co");
    expect(headers["List-Unsubscribe"]).toMatch(/^<https?:\/\/.+\/api\/launch-invite\/unsubscribe\?/);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(launchUnsubscribeUrl("a@b.co")).toContain("token=");
  });
});
