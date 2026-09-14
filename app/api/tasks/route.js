import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireSession, fail } from "../../../lib/apiHelpers";
import { mapTask } from "../../../lib/mapRows";
import { ST } from "../../../lib/constants";

export const runtime = "nodejs";

export async function POST(req) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { projectId } = await req.json();
  if (!projectId) return fail("Thiếu dự án.");

  const { data, error } = await db()
    .from("tasks")
    .insert({ project_id: projectId, created_by: session.id, hm: "", dv: "", acc: "", st: ST.N, gc: "" })
    .select()
    .single();
  if (error) return fail("Không tạo được đầu việc.", 500);
  return NextResponse.json(mapTask(data, []));
}
