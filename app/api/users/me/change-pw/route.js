import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireSession, fail } from "../../../../../lib/apiHelpers";
import { checkPw, hashPw } from "../../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { oldPw, newPw } = await req.json();
  if (!newPw || newPw.length < 6) return fail("Mật khẩu mới phải từ 6 ký tự.");

  const { data: me } = await db().from("users").select("pw_hash").eq("id", session.id).maybeSingle();
  if (!me || !(await checkPw(oldPw, me.pw_hash))) return fail("Mật khẩu hiện tại không đúng.");

  const pw_hash = await hashPw(newPw);
  const { error } = await db().from("users").update({ pw_hash }).eq("id", session.id);
  if (error) return fail("Không đổi được mật khẩu.", 500);

  return NextResponse.json({ ok: true });
}
