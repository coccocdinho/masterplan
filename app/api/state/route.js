import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireSession } from "../../../lib/apiHelpers";
import { mapUser, mapProject, mapTask, mapLog } from "../../../lib/mapRows";

export const runtime = "nodejs";

export async function GET() {
  const { session, res } = await requireSession();
  if (!session) return res;

  const [{ data: users, error: e1 }, { data: projects, error: e2 }, { data: tasks, error: e3 }, { data: subtasks, error: e4 }, { data: logs, error: e5 }] =
    await Promise.all([
      db().from("users").select("id, username, role, created_at, created_by").order("created_at"),
      db().from("projects").select("*").order("created_at"),
      db().from("tasks").select("*"),
      db().from("subtasks").select("*"),
      db().from("logs").select("*").order("ts", { ascending: true }),
    ]);

  const error = e1 || e2 || e3 || e4 || e5;
  if (error) return NextResponse.json({ error: "Lỗi tải dữ liệu." }, { status: 500 });

  return NextResponse.json({
    users: (users || []).map(mapUser),
    projects: (projects || []).map(mapProject),
    tasks: (tasks || []).map((t) => mapTask(t, subtasks || [])),
    logs: (logs || []).map(mapLog),
  });
}
