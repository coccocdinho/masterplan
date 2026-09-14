import { NextResponse } from "next/server";
import { db } from "../../../../../../lib/db";
import { requireSession, fail } from "../../../../../../lib/apiHelpers";
import { mapSubtask } from "../../../../../../lib/mapRows";

export const runtime = "nodejs";

const FIELDS = ["text", "dl", "acc", "st", "gc"];

export async function PATCH(req, { params }) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { id: taskId, subId } = await params;
  const body = await req.json();

  if ("dl" in body && body.dl) {
    const { data: task } = await db().from("tasks").select("dl").eq("id", taskId).maybeSingle();
    if (task?.dl && body.dl > task.dl) {
      return fail(`Hạn việc con không được vượt quá hạn việc cha (${task.dl}).`);
    }
  }

  const patch = {};
  for (const f of FIELDS) {
    if (f in body) patch[f] = f === "dl" ? body[f] || null : body[f];
  }
  if (!Object.keys(patch).length) return fail("Không có thay đổi.");

  const { data, error } = await db().from("subtasks").update(patch).eq("id", subId).select().single();
  if (error) return fail("Không cập nhật được việc con.", 500);
  return NextResponse.json(mapSubtask(data));
}

export async function DELETE(req, { params }) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { subId } = await params;
  const { error } = await db().from("subtasks").delete().eq("id", subId);
  if (error) return fail("Không xoá được việc con.", 500);
  return NextResponse.json({ ok: true });
}
