import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { db } from "./db";

export async function requireSession() {
  const session = await getSession();
  if (!session) return { session: null, res: NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 }) };
  return { session, res: null };
}

export function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function addLog(session, actionCode, targetName = "", detail = "") {
  await db().from("logs").insert({
    action_code: actionCode,
    actor_name: session.username,
    actor_role: session.role,
    target_name: targetName,
    detail,
  });
}
