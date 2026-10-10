import { NextResponse } from "next/server";
import { getLicense } from "@/lib/licenses";
import { tierLimits, type Tier } from "@/lib/site";

export const runtime = "nodejs";

type Body = {
  key?: string;
  licenseKey?: string;
};

export async function POST(request: Request) {
  const secret = process.env.LICENSE_API_SECRET;
  if (secret) {
    const header = request.headers.get("x-license-secret");
    if (header !== secret) {
      return NextResponse.json({ valid: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ valid: false, error: "Invalid JSON" }, { status: 400 });
  }

  const key = (body.key ?? body.licenseKey ?? "").trim();
  if (!key) {
    return NextResponse.json(
      { valid: false, error: "Missing license key" },
      { status: 400 },
    );
  }

  // Free-tier soft key used by the add-on before purchase
  if (key === "free" || key.startsWith("rs_free_")) {
    const tier: Tier = "free";
    return NextResponse.json({
      valid: true,
      tier,
      status: "active",
      limits: tierLimits(tier),
    });
  }

  const record = await getLicense(key);
  if (!record || record.status !== "active") {
    return NextResponse.json({
      valid: false,
      tier: null,
      status: record?.status ?? "missing",
      error: "License not found or inactive",
    });
  }

  return NextResponse.json({
    valid: true,
    tier: record.tier,
    status: record.status,
    email: record.email,
    interval: record.interval,
    limits: tierLimits(record.tier),
  });
}
