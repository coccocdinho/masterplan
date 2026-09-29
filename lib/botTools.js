import "server-only";
import { db } from "./db";
import { addLog } from "./apiHelpers";
import { canAssignOwner } from "./permissions";
import { R, ST, STO } from "./constants";
import { ddiff, day } from "./util";

// Tool handlers the bot can call. Each returns a plain JSON-serializable result or throws
// Error(message-in-Vietnamese) — the caller turns that into an is_error tool_result so the
// model can explain the problem back to the user instead of the request just failing.

const WRITE_NEEDS_CONFIRM = new Set(["update_task"]);
export const needsConfirm = (name) => WRITE_NEEDS_CONFIRM.has(name);

function normSt(s) {
  if (!s) return null;
  const v = STO.find((x) => x === s || x.toLowerCase() === String(s).trim().toLowerCase());
  if (v) return v;
  const low = String(s).trim().toLowerCase();
  if (low.includes("xong") || low.includes("hoàn")) return ST.D;
  if (low.includes("đang")) return ST.I;
  if (low.includes("chưa")) return ST.N;
  return null;
}

async function resolveProject(session, { projectId, projectName }) {
  if (projectId) {
    const { data } = await db().from("projects").select("*").eq("id", projectId).maybeSingle();
    if (!data) throw new Error(`Không tìm thấy dự án với id "${projectId}".`);
    return data;
  }
  if (!projectName) throw new Error("Thiếu tên dự án.");
  const { data: all } = await db().from("projects").select("*");
  const q = projectName.trim().toLowerCase();
  const exact = (all || []).filter((p) => p.name.trim().toLowerCase() === q);
  if (exact.length === 1) return exact[0];
  const partial = (all || []).filter((p) => p.name.toLowerCase().includes(q));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    throw new Error(`Có ${partial.length} dự án khớp với "${projectName}": ${partial.map((p) => p.name).join(", ")}. Hỏi lại người dùng muốn dự án nào.`);
  }
  throw new Error(`Không tìm thấy dự án nào tên gần giống "${projectName}".`);
}

async function resolveOwner(username) {
  if (!username) return null;
  const { data } = await db().from("users").select("id, username").ilike("username", username.trim()).maybeSingle();
  return data?.id || null;
}

const projSummary = (p) => ({ id: p.id, name: p.name, deadline: p.dl, ownerId: p.owner_id });
const taskSummary = (t, projName) => ({
  id: t.id, project: projName, hangMuc: t.hm || null, dauViec: t.dv || "(chưa có tên)",
  deadline: t.dl, phuTrach: t.acc || null, trangThai: t.st, ghiChu: t.gc || null,
});

export const TOOLS = [
  {
    name: "search_projects",
    description: "Tìm dự án theo tên (khớp gần đúng). Dùng khi người dùng hỏi về một dự án nhưng không cho id chính xác, hoặc muốn liệt kê các dự án.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Từ khoá tìm trong tên dự án. Để trống để lấy tất cả." } },
      required: [], additionalProperties: false,
    },
  },
  {
    name: "search_tasks",
    description: "Tìm đầu việc theo nhiều điều kiện: tên dự án, từ khoá trong tên việc, người phụ trách, trạng thái, quá hạn. Luôn gọi tool này trước để lấy đúng id khi cần sửa một việc.",
    input_schema: {
      type: "object",
      properties: {
        projectName: { type: "string", description: "Tên dự án (gần đúng), để trống nếu tìm trên mọi dự án." },
        textQuery: { type: "string", description: "Từ khoá trong tên đầu việc hoặc ghi chú." },
        acc: { type: "string", description: "Tên người phụ trách (gần đúng)." },
        status: { type: "string", enum: STO, description: "Trạng thái chính xác." },
        overdueOnly: { type: "boolean", description: "Chỉ lấy việc đã quá hạn." },
        limit: { type: "integer", description: "Số kết quả tối đa, mặc định 20." },
      },
      required: [], additionalProperties: false,
    },
  },
  {
    name: "get_overview_stats",
    description: "Lấy số liệu tổng quan: số dự án đang chạy, dự án quá hạn, việc quá hạn, việc đến hạn hôm nay, việc sắp đến hạn.",
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "list_urgent_tasks",
    description: "Danh sách việc cần đôn đốc: quá hạn, đến hạn hôm nay, sắp đến hạn (≤3 ngày), hoặc chưa có deadline. Dùng khi người dùng hỏi \"hôm nay cần làm gì\", \"việc nào sắp trễ\".",
    input_schema: {
      type: "object",
      properties: { urgency: { type: "string", enum: ["over", "today", "soon", "none", "all"], description: "Lọc theo mức độ, mặc định all (trừ việc còn nhiều thời gian và đã xong)." } },
      required: [], additionalProperties: false,
    },
  },
  {
    name: "create_project",
    description: "Tạo một dự án mới. Thực hiện ngay, không cần hỏi lại xác nhận trừ khi thiếu thông tin bắt buộc (tên dự án).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Tên dự án, bắt buộc." },
        ownerUsername: { type: "string", description: "Tên đăng nhập người chủ trì (tuỳ chọn)." },
        deadline: { type: "string", description: "Hạn dự án, định dạng YYYY-MM-DD (tuỳ chọn)." },
      },
      required: ["name"], additionalProperties: false,
    },
  },
  {
    name: "create_task",
    description: "Tạo một đầu việc mới trong một dự án đã có sẵn. Thực hiện ngay, không cần hỏi lại xác nhận.",
    input_schema: {
      type: "object",
      properties: {
        projectName: { type: "string", description: "Tên dự án (gần đúng)." },
        hangMuc: { type: "string", description: "Hạng mục (tuỳ chọn)." },
        dauViec: { type: "string", description: "Tên đầu việc, bắt buộc." },
        deadline: { type: "string", description: "Hạn, định dạng YYYY-MM-DD (tuỳ chọn)." },
        acc: { type: "string", description: "Người phụ trách (tuỳ chọn)." },
        status: { type: "string", enum: STO, description: "Trạng thái, mặc định Chưa bắt đầu." },
        ghiChu: { type: "string", description: "Ghi chú (tuỳ chọn)." },
      },
      required: ["projectName", "dauViec"], additionalProperties: false,
    },
  },
  {
    name: "update_task",
    description: "Sửa một đầu việc đã có (đổi hạn, người phụ trách, trạng thái, ghi chú, tên). PHẢI gọi search_tasks trước để có đúng taskId. Hành động này cần người dùng xác nhận trước khi lưu — cứ gọi bình thường, hệ thống tự xử lý phần xác nhận.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "id đầu việc, lấy từ kết quả search_tasks." },
        dauViec: { type: "string" }, hangMuc: { type: "string" },
        deadline: { type: "string", description: "YYYY-MM-DD" },
        acc: { type: "string" }, status: { type: "string", enum: STO }, ghiChu: { type: "string" },
      },
      required: ["taskId"], additionalProperties: false,
    },
  },
];

export async function execTool(name, input, session) {
  switch (name) {
    case "search_projects": {
      const { data: all } = await db().from("projects").select("*").order("name");
      const q = (input.query || "").trim().toLowerCase();
      const rows = q ? (all || []).filter((p) => p.name.toLowerCase().includes(q)) : (all || []);
      return { count: rows.length, projects: rows.slice(0, 30).map(projSummary) };
    }
    case "search_tasks": {
      let projId = null;
      if (input.projectName) projId = (await resolveProject(session, { projectName: input.projectName })).id;
      let q = db().from("tasks").select("*, projects(name)");
      if (projId) q = q.eq("project_id", projId);
      if (input.acc) q = q.ilike("acc", `%${input.acc.trim()}%`);
      const st = normSt(input.status);
      if (st) q = q.eq("st", st);
      const { data } = await q;
      let rows = data || [];
      if (input.textQuery) {
        const tq = input.textQuery.trim().toLowerCase();
        rows = rows.filter((t) => (t.dv || "").toLowerCase().includes(tq) || (t.gc || "").toLowerCase().includes(tq));
      }
      if (input.overdueOnly) rows = rows.filter((t) => t.dl && t.st !== ST.D && ddiff(t.dl) < 0);
      const limit = Math.min(input.limit || 20, 50);
      return { count: rows.length, tasks: rows.slice(0, limit).map((t) => taskSummary(t, t.projects?.name)) };
    }
    case "get_overview_stats": {
      const { data: projects } = await db().from("projects").select("id, dl");
      const { data: tasks } = await db().from("tasks").select("id, project_id, dl, st");
      const today = day();
      let ov = 0, td = 0, sn = 0;
      const byProj = new Map();
      (tasks || []).forEach((t) => {
        if (!byProj.has(t.project_id)) byProj.set(t.project_id, { tot: 0, dn: 0 });
        const s = byProj.get(t.project_id); s.tot++; if (t.st === ST.D) s.dn++;
        if (t.st !== ST.D && t.dl) {
          const d = ddiff(t.dl);
          if (d < 0) ov++; else if (d === 0) td++; else if (d <= 3) sn++;
        }
      });
      let running = 0, overdueProj = 0;
      (projects || []).forEach((p) => {
        const s = byProj.get(p.id) || { tot: 0, dn: 0 };
        const done = s.tot > 0 && s.dn === s.tot;
        if (!done) running++;
        if (p.dl && p.dl < today && !done) overdueProj++;
      });
      return { duAnDangChay: running, duAnQuaHan: overdueProj, viecQuaHan: ov, viecDenHanHomNay: td, viecSapDenHan: sn };
    }
    case "list_urgent_tasks": {
      const { data } = await db().from("tasks").select("*, projects(name)").neq("st", ST.D);
      let rows = (data || []).filter((t) => (t.dv || "").trim());
      const urgOf = (t) => { if (!t.dl) return "none"; const d = ddiff(t.dl); return d < 0 ? "over" : d === 0 ? "today" : d <= 3 ? "soon" : "ok"; };
      if (input.urgency && input.urgency !== "all") rows = rows.filter((t) => urgOf(t) === input.urgency);
      else rows = rows.filter((t) => ["over", "today", "soon", "none"].includes(urgOf(t)));
      rows.sort((a, b) => { const da = a.dl ? ddiff(a.dl) : 1e8, db_ = b.dl ? ddiff(b.dl) : 1e8; return da - db_; });
      return { count: rows.length, tasks: rows.slice(0, 30).map((t) => ({ ...taskSummary(t, t.projects?.name), mucDo: urgOf(t) })) };
    }
    case "create_project": {
      if (!input.name?.trim()) throw new Error("Thiếu tên dự án.");
      const ownerId = canAssignOwner(session.role) ? await resolveOwner(input.ownerUsername) : null;
      const { data: proj, error } = await db().from("projects")
        .insert({ name: input.name.trim(), owner_id: ownerId, dl: input.deadline || null, created_by: session.id })
        .select().single();
      if (error) throw new Error("Không tạo được dự án.");
      await addLog(session, "cp", proj.name, "Qua Trợ lý");
      return { ok: true, project: projSummary(proj) };
    }
    case "create_task": {
      if (!input.dauViec?.trim()) throw new Error("Thiếu tên đầu việc.");
      const proj = await resolveProject(session, { projectName: input.projectName });
      const { data: task, error } = await db().from("tasks").insert({
        project_id: proj.id, created_by: session.id, hm: input.hangMuc || "", dv: input.dauViec.trim(),
        dl: input.deadline || null, acc: input.acc || "", st: normSt(input.status) || ST.N, gc: input.ghiChu || "",
      }).select().single();
      if (error) throw new Error("Không tạo được đầu việc.");
      return { ok: true, task: taskSummary(task, proj.name) };
    }
    default:
      throw new Error(`Không có công cụ "${name}".`);
  }
}

/** Builds a human-readable preview of an update_task call for the confirm card, without writing anything. */
export async function previewUpdateTask(input) {
  const { data: t } = await db().from("tasks").select("*, projects(name)").eq("id", input.taskId).maybeSingle();
  if (!t) throw new Error("Không tìm thấy đầu việc để sửa.");
  const FIELD_LABEL = { dauViec: "Đầu việc", hangMuc: "Hạng mục", deadline: "Deadline", acc: "Phụ trách", status: "Trạng thái", ghiChu: "Ghi chú" };
  const CUR = { dauViec: t.dv, hangMuc: t.hm, deadline: t.dl, acc: t.acc, status: t.st, ghiChu: t.gc };
  const changes = [];
  for (const f of Object.keys(FIELD_LABEL)) {
    if (f in input && input[f] !== undefined) {
      const newVal = f === "status" ? normSt(input[f]) || input[f] : input[f];
      if (String(newVal || "") !== String(CUR[f] || "")) changes.push({ field: f, label: FIELD_LABEL[f], from: CUR[f] || "(trống)", to: newVal || "(trống)" });
    }
  }
  return { task: taskSummary(t, t.projects?.name), changes };
}

/** Actually applies an update_task the human has confirmed. */
export async function executeConfirmedUpdate(input) {
  const patch = {};
  if ("dauViec" in input) patch.dv = input.dauViec;
  if ("hangMuc" in input) patch.hm = input.hangMuc;
  if ("deadline" in input) patch.dl = input.deadline || null;
  if ("acc" in input) patch.acc = input.acc;
  if ("status" in input) { const s = normSt(input.status); if (s) patch.st = s; }
  if ("ghiChu" in input) patch.gc = input.ghiChu;
  if (!Object.keys(patch).length) return { ok: true, changed: false };
  const { data: t, error } = await db().from("tasks").update(patch).eq("id", input.taskId).select("*, projects(name)").single();
  if (error) throw new Error("Không cập nhật được đầu việc.");
  return { ok: true, changed: true, task: taskSummary(t, t.projects?.name) };
}
