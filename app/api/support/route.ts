import { NextResponse } from "next/server";
import { saveSupportSubmission } from "@/lib/support-store";

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
  // Honeypot — bots fill this; humans never see it.
  if (clip(data.company, 200).length > 0) {
    return NextResponse.json({ ok: true, id: "ignored" });
  }

  const email = clip(data.email, 254).toLowerCase();
  const name = clip(data.name, 120);
  const subject = clip(data.subject, 160);
  const message = clip(data.message, 4000);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (name.length < 1) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (subject.length < 1) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: "Message must be at least 10 characters." },
      { status: 400 },
    );
  }

  const record = await saveSupportSubmission({
    email,
    name,
    subject,
    message,
    userAgent: request.headers.get("user-agent")?.slice(0, 300) || undefined,
  });

  return NextResponse.json({
    ok: true,
    id: record.id,
    createdAt: record.createdAt,
  });
}
