import { NextResponse } from "next/server";
import { listLaunchInvites } from "@/lib/launch-invites";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const expected = process.env.LICENSE_API_SECRET || "";
  if (!expected || expected.includes("REPLACE")) {
    return NextResponse.json(
      { error: "LICENSE_API_SECRET is not configured" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const secretHeader = request.headers.get("x-license-secret") || "";
  if ((bearer || secretHeader) !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || "200");
  const invites = await listLaunchInvites(Number.isFinite(limitRaw) ? limitRaw : 200);
  return NextResponse.json({ count: invites.length, invites });
}
