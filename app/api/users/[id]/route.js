import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { requireSession, fail, addLog } from "../../../../lib/apiHelpers";
import { canCreate } from "../../../../lib/permissions";

export const runtime = "nodejs";

export async function DELETE(req, { params }) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { id } = await params;

  if (id === session.id) return fail("Không thể tự xoá tài khoản của mình.", 403);

  const { data: target } = await db().from("users").select("id, username, role").eq("id", id).maybeSingle();
  if (!target) return fail("Không tìm thấy tài khoản.", 404);
  if (!canCreate(session.role, target.role)) return fail("Không có quyền xoá tài khoản này.", 403);

  const { error } = await db().from("users").delete().eq("id", id);
  if (error) return fail("Không xoá được tài khoản.", 500);

  await addLog(session, "du", target.username);
  return NextResponse.json({ ok: true });
}
