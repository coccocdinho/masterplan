import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { sheetsConfigured } from "../../../../lib/sheets";
import { syncAll } from "../../../../lib/sheetSync";

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
    const r = await syncAll();
    if (r.created || r.updated || r.pushed) {
      await db().from("logs").insert({
        action_code: "sy", actor_name: "Hệ thống", actor_role: "system",
        target_name: "Đồng bộ 2 chiều (tự động)", detail: `Sheet → App: ${r.created} mới, ${r.updated} cập nhật · App → Sheet: ${r.pushed} dòng`,
      });
    }
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
