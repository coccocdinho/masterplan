import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireSession, fail, addLog } from "../../../lib/apiHelpers";
import { ST } from "../../../lib/constants";

export const runtime = "nodejs";

function toSubtaskRow(vc) {
  const s = (vc || "").trim();
  return s ? { text: s, dl: null, acc: "", st: ST.N, gc: "" } : null;
}

// body: { picked: [{ name, tasks: [{hm,dv,vc,dl,acc,st,gc}] }] } — client already parsed the .xlsx (lib/parseSheet.js logic, ported into a client copy).
export async function POST(req) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { picked } = await req.json();
  if (!Array.isArray(picked) || !picked.length) return fail("Không có sheet nào được chọn.");

  for (const p of picked) {
    const { data: proj, error: e1 } = await db()
      .from("projects")
      .insert({ name: p.name, created_by: session.id })
      .select()
      .single();
    if (e1 || !proj) continue;

    const rows = (p.tasks || []).filter((t) => (t.dv || "").trim() || (t.vc || "").trim());
    if (!rows.length) continue;
    const { data: tasks } = await db()
      .from("tasks")
      .insert(
        rows.map((t) => ({
          project_id: proj.id,
          created_by: session.id,
          hm: t.hm || "",
          dv: t.dv || "",
          dl: t.dl || null,
          acc: t.acc || "",
          st: t.st || ST.N,
          gc: t.gc || "",
        }))
      )
      .select();
    if (tasks) {
      const subtaskRows = [];
      tasks.forEach((task, i) => {
        const sub = toSubtaskRow(rows[i].vc);
        if (sub) subtaskRows.push({ ...sub, task_id: task.id, position: 0 });
      });
      if (subtaskRows.length) await db().from("subtasks").insert(subtaskRows);
    }
  }

  await addLog(session, "ip", `${picked.length} dự án`, picked.map((p) => p.name).join(", "));
  return NextResponse.json({ ok: true });
}
