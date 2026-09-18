import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { sheetsConfigured } from "../../../../lib/sheets";
import { pullAll } from "../../../../lib/sheetSync";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set on the project.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sheetsConfigured()) return NextResponse.json({ skipped: "not_configured" });
  try {
    const r = await pullAll();
    if (r.created || r.updated) {
      await db().from("logs").insert({
        action_code: "sy", actor_name: "Hệ thống", actor_role: "system",
        target_name: "Sheet → App (tự động)", detail: `${r.created} việc mới, ${r.updated} việc cập nhật`,
      });
    }
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
