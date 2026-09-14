import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireSession, fail, addLog } from "../../../lib/apiHelpers";
import { mapProject } from "../../../lib/mapRows";
import { canAssignOwner } from "../../../lib/permissions";
import { ST } from "../../../lib/constants";

export const runtime = "nodejs";

function toSubtaskRow(vc) {
  const s = (vc || "").trim();
  return s ? { text: s, dl: null, acc: "", st: ST.N, gc: "" } : null;
}

export async function POST(req) {
  const { session, res } = await requireSession();
  if (!session) return res;

  const { name, owner, dl, csv } = await req.json();
  if (!name?.trim()) return fail("Thiếu tên dự án.");

  const ownerId = canAssignOwner(session.role) && owner ? owner : null;

  const { data: proj, error: e1 } = await db()
    .from("projects")
    .insert({ name: name.trim(), owner_id: ownerId, dl: dl || null, created_by: session.id })
    .select()
    .single();
  if (e1) return fail("Không tạo được dự án.", 500);

  let taskCount = 0;
  const rows = (csv || []).filter((t) => (t.dv || "").trim() || (t.vc || "").trim());
  if (rows.length) {
    const { data: tasks, error: e2 } = await db()
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
    if (!e2 && tasks) {
      taskCount = tasks.length;
      const subtaskRows = [];
      tasks.forEach((task, i) => {
        const sub = toSubtaskRow(rows[i].vc);
        if (sub) subtaskRows.push({ ...sub, task_id: task.id, position: 0 });
      });
      if (subtaskRows.length) await db().from("subtasks").insert(subtaskRows);
    }
  }

  await addLog(session, "cp", name.trim(), taskCount ? `${taskCount} đầu việc` : "");
  return NextResponse.json(mapProject(proj));
}
