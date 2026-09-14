import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireSession, fail, addLog } from "../../../lib/apiHelpers";
import { mapUser } from "../../../lib/mapRows";
import { canCreate } from "../../../lib/permissions";
import { RL } from "../../../lib/constants";
import { hashPw } from "../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  const { session, res } = await requireSession();
  if (!session) return res;

  const { username, role, pw } = await req.json();
  if (!username?.trim() || !pw || pw.length < 6) return fail("Tên đăng nhập hoặc mật khẩu không hợp lệ.");
  if (!canCreate(session.role, role)) return fail("Không có quyền tạo tài khoản vai trò này.", 403);

  const { data: dup } = await db().from("users").select("id").eq("username", username.trim()).maybeSingle();
  if (dup) return fail("Tên đăng nhập đã tồn tại.");

  const pw_hash = await hashPw(pw);
  const { data, error } = await db()
    .from("users")
    .insert({ username: username.trim(), role, pw_hash, created_by: session.username })
    .select()
    .single();
  if (error) return fail("Không tạo được tài khoản.", 500);

  await addLog(session, "au", username.trim(), `Vai trò: ${RL[role]}`);
  return NextResponse.json(mapUser(data));
}
