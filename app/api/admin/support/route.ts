import { NextResponse } from "next/server";
import {
  listSupportSubmissions,
  supportStorageBackend,
} from "@/lib/support-store";

export const runtime = "nodejs";

/**
 * Admin-readable support inbox.
 * Auth: Authorization: Bearer <LICENSE_API_SECRET> or x-license-secret header.
 */
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
  const token = bearer || secretHeader;
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || "100");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 100;
  const submissions = await listSupportSubmissions(limit);

  return NextResponse.json({
    backend: supportStorageBackend(),
    count: submissions.length,
    submissions,
  });
}
