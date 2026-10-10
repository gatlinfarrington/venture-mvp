import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployed git SHA for prod verification (`scripts/verify-prod.sh`).
 * On Vercel: VERCEL_GIT_COMMIT_SHA. Local/CI fallback: GITHUB_SHA or "unknown".
 */
export async function GET() {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim() ||
    "unknown";

  return NextResponse.json(
    {
      sha,
      commit: sha,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
