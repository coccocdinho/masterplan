import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireSession, fail } from "../../../../../lib/apiHelpers";
import { mapSubtask } from "../../../../../lib/mapRows";
import { ST } from "../../../../../lib/constants";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const { session, res } = await requireSession();
  if (!session) return res;
  const { id: taskId } = await params;

  const { count } = await db().from("subtasks").select("id", { count: "exact", head: true }).eq("task_id", taskId);
  const { data, error } = await db()
    .from("subtasks")
    .insert({ task_id: taskId, text: "", acc: "", st: ST.N, gc: "", position: count || 0 })
    .select()
    .single();
  if (error) return fail("Không thêm được việc con.", 500);
  return NextResponse.json(mapSubtask(data));
}
