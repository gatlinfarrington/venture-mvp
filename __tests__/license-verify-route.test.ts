import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/licenses", () => ({
  getLicense: vi.fn(),
}));

import { getLicense } from "@/lib/licenses";
import { POST } from "@/app/api/license/verify/route";

describe("POST /api/license/verify limits", () => {
  beforeEach(() => {
    vi.mocked(getLicense).mockReset();
    delete process.env.LICENSE_API_SECRET;
  });

  it("returns maxStores 20 for an active Business license", async () => {
    vi.mocked(getLicense).mockResolvedValue({
      key: "rs_business_test",
      tier: "business",
      status: "active",
      email: "example@example.com",
      interval: "month",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    });

    const res = await POST(
      new Request("http://localhost/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "rs_business_test" }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.tier).toBe("business");
    expect(body.limits).toEqual({
      maxSources: 4,
      maxStores: 20,
      scheduledRefresh: true,
    });
  });
});
