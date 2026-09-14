import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { requireSession, fail, addLog } from "../../../../lib/apiHelpers";
import { mapProject } from "../../../../lib/mapRows";
import { canAssignOwner, canDelProj } from "../../../../lib/permissions";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { id } = await params;
  const body = await req.json();

  const patch = {};
  if ("owner" in body) {
    if (!canAssignOwner(session.role)) return fail("Không có quyền gán người chủ trì.", 403);
    patch.owner_id = body.owner || null;
  }
  if ("dl" in body) patch.dl = body.dl || null;
  if (!Object.keys(patch).length) return fail("Không có thay đổi.");

  const { data, error } = await db().from("projects").update(patch).eq("id", id).select().single();
  if (error) return fail("Không cập nhật được dự án.", 500);
  return NextResponse.json(mapProject(data));
}

export async function DELETE(req, { params }) {
  const { session, res } = await requireSession();
  if (!session) return res;
  if (!canDelProj(session.role)) return fail("Không có quyền xoá dự án.", 403);
  const { id } = await params;

  const { data: proj } = await db().from("projects").select("name").eq("id", id).maybeSingle();
  if (!proj) return fail("Không tìm thấy dự án.", 404);
  const { count } = await db().from("tasks").select("id", { count: "exact", head: true }).eq("project_id", id);

  const { error } = await db().from("projects").delete().eq("id", id);
  if (error) return fail("Không xoá được dự án.", 500);

  await addLog(session, "dp", proj.name, count ? `Kèm ${count} đầu việc` : "");
  return NextResponse.json({ ok: true });
}
