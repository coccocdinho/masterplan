import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireSession, fail, addLog } from "../../../lib/apiHelpers";
import { canSync } from "../../../lib/permissions";
import { sheetsConfigured } from "../../../lib/sheets";
import { pullAll, pushProject, linkExisting, approvePending, rejectPending, getLastPull, subtaskOverflow } from "../../../lib/sheetSync";

export const runtime = "nodejs";
export const maxDuration = 60;

const AUTO_MIN_GAP_MS = 15 * 60 * 1000;

export async function GET() {
  const { session, res } = await requireSession();
  if (!session) return res;
  if (!canSync(session.role)) return fail("Không có quyền.", 403);

  const configured = sheetsConfigured();
  const [{ data: pending }, { data: linked }, last] = await Promise.all([
    db().from("pending_sheet_projects").select("*").eq("status", "pending").order("detected_at"),
    db().from("projects").select("id, name, sheet_tab_name").not("sheet_tab_name", "is", null).order("name"),
    getLastPull(),
  ]);
  const linkedOut = [];
  for (const p of linked || []) linkedOut.push({ ...p, extraSubtasks: await subtaskOverflow(p.id) });
  return NextResponse.json({ configured, pending: pending || [], linked: linkedOut, last });
}

export async function POST(req) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (!sheetsConfigured()) return action === "pull" && body.auto ? NextResponse.json({ skipped: "not_configured" }) : fail("Chưa cấu hình Google Sheets.", 503);

  try {
    if (action === "pull") {
      if (body.auto) {
        const last = await getLastPull();
        if (last?.at && Date.now() - last.at < AUTO_MIN_GAP_MS) return NextResponse.json({ skipped: "recent", last });
      } else if (!canSync(session.role)) return fail("Không có quyền.", 403);
      const r = await pullAll();
      if (r.created || r.updated) await addLog(session, "sy", "Sheet → App", `${r.created} việc mới, ${r.updated} việc cập nhật`);
      return NextResponse.json(r);
    }

    if (!canSync(session.role)) return fail("Không có quyền.", 403);

    if (action === "push") {
      if (!body.projectId) return fail("Thiếu projectId.");
      const r = await pushProject(body.projectId);
      await addLog(session, "sy", "App → Sheet", `Tab "${r.tab}": đẩy ${r.pushed} việc${r.conflicts.length ? `, ${r.conflicts.length} xung đột` : ""}`);
      return NextResponse.json(r);
    }
    if (action === "link") {
      if (!body.projectId || !body.tab) return fail("Thiếu dự án hoặc tab.");
      const r = await linkExisting(body.projectId, body.tab, body.pendingId);
      await addLog(session, "sy", "App → Sheet", `Liên kết tab "${r.tab}" (App là bản chính): đẩy ${r.pushed} việc`);
      return NextResponse.json(r);
    }
    if (action === "approve") {
      const r = await approvePending(body.pendingId, session);
      await addLog(session, "sy", "Nhập tab từ Sheet", `${r.project.name}: ${r.created} việc`);
      return NextResponse.json(r);
    }
    if (action === "reject") {
      await rejectPending(body.pendingId);
      return NextResponse.json({ ok: true });
    }
    return fail("Hành động không hợp lệ.");
  } catch (e) {
    return fail(e.message || "Lỗi đồng bộ.", 500);
  }
}
