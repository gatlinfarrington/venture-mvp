import { NextResponse } from "next/server";
import { saveLaunchInvite } from "@/lib/launch-invites";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  if (clip(data.company, 200).length > 0) {
    return NextResponse.json({ ok: true, created: false });
  }

  const email = clip(data.email, 254).toLowerCase();
  const source = clip(data.source, 80) || undefined;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const result = await saveLaunchInvite(email, source);
  return NextResponse.json({
    ok: true,
    created: result.created,
    email: result.invite.email,
  });
}
