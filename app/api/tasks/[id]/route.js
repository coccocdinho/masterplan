import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { requireSession, fail, addLog } from "../../../../lib/apiHelpers";
import { mapTask } from "../../../../lib/mapRows";
import { canDelTask } from "../../../../lib/permissions";

export const runtime = "nodejs";

const FIELDS = ["hm", "dv", "dl", "acc", "st", "gc"];

export async function PATCH(req, { params }) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { id } = await params;
  const body = await req.json();

  const patch = {};
  for (const f of FIELDS) {
    if (f in body) patch[f] = f === "dl" ? body[f] || null : body[f];
  }
  if (!Object.keys(patch).length) return fail("Không có thay đổi.");

  const { data: task, error } = await db().from("tasks").update(patch).eq("id", id).select().single();
  if (error) return fail("Không cập nhật được đầu việc.", 500);
  const { data: subtasks } = await db().from("subtasks").select("*").eq("task_id", id);
  return NextResponse.json(mapTask(task, subtasks || []));
}

export async function DELETE(req, { params }) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { id } = await params;

  const { data: task } = await db().from("tasks").select("*, projects(name)").eq("id", id).maybeSingle();
  if (!task) return fail("Không tìm thấy đầu việc.", 404);
  if (!canDelTask({ by: task.created_by }, session.role, session.id)) return fail("Không có quyền xoá đầu việc này.", 403);

  const { error } = await db().from("tasks").delete().eq("id", id);
  if (error) return fail("Không xoá được đầu việc.", 500);

  const name = task.dv || "(chưa có tên)";
  const projName = task.projects?.name;
  await addLog(session, "dt", name, projName ? `Trong dự án: ${projName}` : "");
  return NextResponse.json({ ok: true });
}
