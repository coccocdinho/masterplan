import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { checkPw, signSession, sessionCookieOptions } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Thiếu tên đăng nhập hoặc mật khẩu." }, { status: 400 });
  }

  const { data: user, error } = await db()
    .from("users")
    .select("id, username, role, pw_hash")
    .eq("username", username)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Lỗi máy chủ." }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Tên đăng nhập không tồn tại." }, { status: 401 });

  const ok = await checkPw(password, user.pw_hash);
  if (!ok) return NextResponse.json({ error: "Mật khẩu không đúng." }, { status: 401 });

  const token = signSession(user);
  const res = NextResponse.json({ id: user.id, username: user.username, role: user.role });
  res.cookies.set({ ...sessionCookieOptions(), value: token });
  return res;
}
