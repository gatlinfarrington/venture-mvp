import { NextResponse } from "next/server";
import {
  launchUnsubscribeFooter,
  verifyLaunchUnsubscribeToken,
} from "@/lib/launch-email";
import { removeLaunchInvite } from "@/lib/launch-invites";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function paramsFrom(request: Request): { email: string; token: string } {
  const url = new URL(request.url);
  return {
    email: (url.searchParams.get("email") || "").trim().toLowerCase(),
    token: (url.searchParams.get("token") || "").trim(),
  };
}

async function unsubscribe(email: string, token: string) {
  if (!EMAIL_RE.test(email) || !token || !verifyLaunchUnsubscribeToken(email, token)) {
    return { ok: false as const, status: 400, message: "Invalid unsubscribe link." };
  }
  await removeLaunchInvite(email);
  return { ok: true as const, status: 200, message: "You’re unsubscribed from the launch list." };
}

/** Browser one-click link (GET). */
export async function GET(request: Request) {
  const { email, token } = paramsFrom(request);
  const result = await unsubscribe(email, token);
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Unsubscribe</title></head><body style="font:16px/1.5 system-ui;max-width:36rem;margin:3rem auto;padding:0 1.25rem"><p>${result.message}</p></body></html>`;
  return new NextResponse(body, {
    status: result.status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * RFC 8058 one-click (POST). Mail clients send List-Unsubscribe=One-Click.
 * Also accepts JSON { email, token } for tests.
 */
export async function POST(request: Request) {
  const urlParams = paramsFrom(request);
  let email = urlParams.email;
  let token = urlParams.token;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { email?: string; token?: string };
      if (body.email) email = body.email.trim().toLowerCase();
      if (body.token) token = body.token.trim();
    } catch {
      /* fall through to form / query */
    }
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const formEmail = form.get("email");
    const formToken = form.get("token");
    if (typeof formEmail === "string" && formEmail) email = formEmail.trim().toLowerCase();
    if (typeof formToken === "string" && formToken) token = formToken.trim();
  }

  const result = await unsubscribe(email, token);
  return NextResponse.json(
    { ok: result.ok, message: result.message, hint: launchUnsubscribeFooter(email) },
    { status: result.status },
  );
}
