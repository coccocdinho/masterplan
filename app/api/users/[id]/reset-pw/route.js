import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireSession, fail, addLog } from "../../../../../lib/apiHelpers";
import { canResetPw } from "../../../../../lib/permissions";
import { hashPw } from "../../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { id } = await params;
  const { newPw } = await req.json();
  if (!newPw || newPw.length < 6) return fail("Mật khẩu mới phải từ 6 ký tự.");

  const { data: target } = await db().from("users").select("id, username, role").eq("id", id).maybeSingle();
  if (!target) return fail("Không tìm thấy tài khoản.", 404);
  if (!canResetPw(session.role, target.role)) return fail("Không có quyền reset mật khẩu tài khoản này.", 403);

  const pw_hash = await hashPw(newPw);
  const { error } = await db().from("users").update({ pw_hash }).eq("id", id);
  if (error) return fail("Không đặt lại được mật khẩu.", 500);

  await addLog(session, "rp", target.username);
  return NextResponse.json({ ok: true });
}
