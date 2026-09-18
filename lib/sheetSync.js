import "server-only";
import crypto from "crypto";
import { db } from "./db";
import { ST } from "./constants";
import { SKIP, mCol, normSt, parseDate } from "./parseSheet";
import * as gs from "./sheets";

const cellStr = (v) => (v == null ? "" : String(v).trim());
const isSkipTab = (t) => t.hidden || SKIP.some((s) => t.title.trim().toLowerCase() === s || t.title.trim().toLowerCase().startsWith(s));
const FIELDS = ["hm", "dv", "vc", "dl", "acc", "st", "gc"];

// Content hash of one task/row in Sheet terms. Same function for both sides so hashes are comparable.
export function hashOf(r) {
  const s = FIELDS.map((f) => String(r[f] || "").trim().replace(/\s+/g, " ")).join("␟");
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);
}

/** Parses one tab's raw grid. Returns null when the tab has no recognisable task table. */
export function parseTab(values) {
  let hi = -1, cm = {}, header = [];
  for (let i = 0; i < Math.min(10, values.length); i++) {
    const m = {};
    (values[i] || []).forEach((c, ci) => {
      const f = mCol(String(c ?? ""));
      if (f && m[f] === undefined) m[f] = ci;
    });
    if (m.dv !== undefined && m.st !== undefined) { hi = i; cm = m; header = values[i]; break; }
  }
  if (hi === -1) return null;
  let idCol = header.findIndex((c) => cellStr(c).toLowerCase() === "_id");
  const idExists = idCol >= 0;
  if (!idExists) {
    let last = -1;
    header.forEach((c, i) => { if (cellStr(c)) last = i; });
    idCol = last + 1;
  }
  const rows = [];
  let lastUsed = hi + 1; // 1-based row number of the last row that holds content or an id
  for (let i = hi + 1; i < values.length; i++) {
    const row = values[i] || [];
    const g = (f) => (cm[f] !== undefined ? cellStr(row[cm[f]]) : "");
    const dlRaw = cm.dl !== undefined ? row[cm.dl] : "";
    const item = {
      rowNo: i + 1,
      hm: g("hm"), dv: g("dv"), vc: g("vc"),
      dl: typeof dlRaw === "number" ? gs.serialToIso(dlRaw) : parseDate(cellStr(dlRaw)),
      acc: g("acc"), st: normSt(g("st")), gc: g("gc"),
      id: cellStr(row[idCol]),
    };
    if (item.dv || item.vc) { rows.push(item); lastUsed = i + 1; }
    else if (item.id) lastUsed = i + 1;
  }
  return { hi, cm, idCol, idExists, headerRowNo: hi + 1, rows, lastUsed };
}

// ---------- state / lock ----------
async function getState(key) {
  const { data } = await db().from("sync_state").select("value").eq("key", key).maybeSingle();
  return data?.value || null;
}
async function setState(key, value) {
  await db().from("sync_state").upsert({ key, value, updated_at: new Date().toISOString() });
}
export const getLastPull = () => getState("last_pull");

async function withLock(fn) {
  const lock = await getState("lock");
  if (lock?.until && lock.until > Date.now()) throw new Error("Đang có một lượt đồng bộ khác chạy, thử lại sau ít phút.");
  await setState("lock", { until: Date.now() + 2 * 60 * 1000 });
  try {
    return await fn();
  } finally {
    await setState("lock", { until: 0 });
  }
}

// ---------- DB helpers ----------
async function loadTasks(projectId) {
  const { data: tasks } = await db().from("tasks").select("*").eq("project_id", projectId);
  const ids = (tasks || []).map((t) => t.id);
  let subs = [];
  if (ids.length) {
    const r = await db().from("subtasks").select("*").in("task_id", ids).order("position");
    subs = r.data || [];
  }
  const firstSub = new Map();
  subs.forEach((s) => { if (!firstSub.has(s.task_id)) firstSub.set(s.task_id, s); });
  return { tasks: tasks || [], firstSub };
}
const appRow = (t, firstSub) => ({
  hm: t.hm || "", dv: t.dv || "", vc: firstSub.get(t.id)?.text || "",
  dl: t.dl || "", acc: t.acc || "", st: t.st || ST.N, gc: t.gc || "",
});

// ---------- Sheet -> App, one linked project ----------
async function pullProject(proj, parsed, tab, writes, stats) {
  const { tasks, firstSub } = await loadTasks(proj.id);
  const byUid = new Map(tasks.filter((t) => t.sheet_row_uid).map((t) => [t.sheet_row_uid, t]));
  const seen = new Set();
  const toCreate = [];

  for (const row of parsed.rows) {
    let id = row.id;
    if (id && seen.has(id)) id = ""; // duplicated row: treat as a new task
    if (id) {
      seen.add(id);
      const t = byUid.get(id);
      if (!t) { stats.orphans.push({ tab, row: row.rowNo, name: row.dv || row.vc }); continue; }
      const h = hashOf(row);
      if (t.sheet_hash && h === t.sheet_hash) continue; // Sheet unchanged since last sync
      if (t.sheet_hash && hashOf(appRow(t, firstSub)) !== t.sheet_hash) {
        stats.conflicts.push({ tab, row: row.rowNo, name: row.dv || row.vc });
        continue;
      }
      const { error } = await db().from("tasks").update({
        hm: row.hm, dv: row.dv, dl: row.dl || null, acc: row.acc, st: row.st, gc: row.gc, sheet_hash: h,
      }).eq("id", t.id);
      if (error) throw new Error(`Không cập nhật được việc "${row.dv}".`);
      if (row.vc) {
        const sub = firstSub.get(t.id);
        if (sub) await db().from("subtasks").update({ text: row.vc }).eq("id", sub.id);
        else await db().from("subtasks").insert({ task_id: t.id, text: row.vc, st: ST.N, position: 0 });
      }
      stats.updated++;
    } else {
      toCreate.push({ row, uid: crypto.randomUUID() });
    }
  }

  if (toCreate.length) {
    const { data: created, error } = await db().from("tasks").insert(
      toCreate.map(({ row, uid }) => ({
        project_id: proj.id, created_by: null, hm: row.hm, dv: row.dv, dl: row.dl || null,
        acc: row.acc, st: row.st, gc: row.gc, sheet_row_uid: uid, sheet_hash: hashOf(row),
      }))
    ).select();
    if (error) throw new Error("Không tạo được đầu việc từ Sheet.");
    const subs = [];
    created.forEach((t) => {
      const item = toCreate.find((c) => c.uid === t.sheet_row_uid);
      if (item.row.vc) subs.push({ task_id: t.id, text: item.row.vc, st: ST.N, position: 0 });
    });
    if (subs.length) await db().from("subtasks").insert(subs);
    // Sheet write happens after the DB insert; roll the insert back if it fails so a retry can't duplicate rows.
    try {
      const w = [];
      if (!parsed.idExists) w.push({ tab, range: `${gs.colLetter(parsed.idCol)}${parsed.headerRowNo}`, values: [["_id"]] });
      toCreate.forEach(({ row, uid }) => w.push({ tab, range: `${gs.colLetter(parsed.idCol)}${row.rowNo}`, values: [[uid]] }));
      writes.push(...w);
      await gs.writeCells(writes.splice(0));
    } catch (e) {
      await db().from("tasks").delete().in("sheet_row_uid", toCreate.map((c) => c.uid));
      throw e;
    }
    stats.created += toCreate.length;
  } else if (!parsed.idExists && parsed.rows.length) {
    await gs.writeCells([{ tab, range: `${gs.colLetter(parsed.idCol)}${parsed.headerRowNo}`, values: [["_id"]] }]);
  }
}

/** Pull every linked tab, queue unknown tabs for review. */
export async function pullAll() {
  return withLock(async () => {
    const stats = { created: 0, updated: 0, conflicts: [], orphans: [], missing: [], newPending: 0, errors: [] };
    const tabs = (await gs.listTabs()).filter((t) => !isSkipTab(t));
    const { data: projects } = await db().from("projects").select("id, name, sheet_tab_name").not("sheet_tab_name", "is", null);
    const { data: pend } = await db().from("pending_sheet_projects").select("*");
    const linkedByTab = new Map((projects || []).map((p) => [p.sheet_tab_name, p]));
    const tabTitles = new Set(tabs.map((t) => t.title));
    (projects || []).forEach((p) => { if (!tabTitles.has(p.sheet_tab_name)) stats.missing.push(p.name); });

    const values = await gs.readTabs(tabs.map((t) => t.title));
    for (const t of tabs) {
      try {
        const parsed = parseTab(values[t.title] || []);
        if (!parsed) continue;
        const proj = linkedByTab.get(t.title);
        if (proj) {
          await pullProject(proj, parsed, t.title, [], stats);
        } else {
          const prev = (pend || []).find((p) => p.source_tab_name === t.title);
          if (prev && (prev.status === "pending" || prev.status === "rejected")) continue;
          const snapshot = { rowCount: parsed.rows.length, sample: parsed.rows.slice(0, 5).map((r) => r.dv || r.vc) };
          if (prev) await db().from("pending_sheet_projects").update({ status: "pending", source_row_snapshot: snapshot, detected_at: new Date().toISOString() }).eq("id", prev.id);
          else await db().from("pending_sheet_projects").insert({ source_tab_name: t.title, source_row_snapshot: snapshot });
          stats.newPending++;
        }
      } catch (e) {
        stats.errors.push(`${t.title}: ${e.message}`);
      }
    }
    const result = { at: Date.now(), ...stats };
    await setState("last_pull", result);
    return result;
  });
}

/** Approve a queued tab: create the project and pull its rows. */
export async function approvePending(pendingId, session) {
  return withLock(async () => {
    const { data: pend } = await db().from("pending_sheet_projects").select("*").eq("id", pendingId).maybeSingle();
    if (!pend) throw new Error("Không tìm thấy mục chờ duyệt.");
    const tab = pend.source_tab_name;
    const { data: exists } = await db().from("projects").select("id").eq("sheet_tab_name", tab).maybeSingle();
    if (exists) throw new Error("Tab này đã được liên kết với một dự án.");
    const { data: proj, error } = await db().from("projects").insert({ name: tab, created_by: session.id, sheet_tab_name: tab }).select().single();
    if (error) throw new Error("Không tạo được dự án.");
    const stats = { created: 0, updated: 0, conflicts: [], orphans: [], missing: [], newPending: 0, errors: [] };
    try {
      const parsed = parseTab((await gs.readTabs([tab]))[tab] || []);
      if (!parsed) throw new Error("Tab không có bảng đầu việc hợp lệ.");
      await pullProject(proj, parsed, tab, [], stats);
    } catch (e) {
      await db().from("projects").delete().eq("id", proj.id);
      throw e;
    }
    await db().from("pending_sheet_projects").update({ status: "approved" }).eq("id", pendingId);
    return { project: proj, created: stats.created };
  });
}

export async function rejectPending(pendingId) {
  await db().from("pending_sheet_projects").update({ status: "rejected" }).eq("id", pendingId);
}

// ---------- App -> Sheet ----------
const TAB_BAD = /[\[\]*?:\/\\]/g;
async function createTabFor(proj) {
  const tabs = await gs.listTabs();
  const taken = new Set(tabs.map((t) => t.title.toLowerCase()));
  let title = proj.name.replace(TAB_BAD, " ").trim().slice(0, 90) || "Dự án";
  for (let n = 2; taken.has(title.toLowerCase()); n++) title = `${title.replace(/ \(\d+\)$/, "")} (${n})`;

  // Prefer duplicating an existing project tab so formulas, validation and formatting carry over.
  const cands = tabs.filter((t) => !isSkipTab(t));
  const vals = cands.length ? await gs.readTabs(cands.slice(0, 3).map((t) => t.title)) : {};
  const tpl = cands.slice(0, 3).find((t) => parseTab(vals[t.title] || []));
  let created;
  if (tpl) {
    created = await gs.duplicateTab(tpl.gid, title);
    const parsed = parseTab((await gs.readTabs([created.title]))[created.title] || []);
    for (const f of Object.keys(parsed.cm)) {
      const L = gs.colLetter(parsed.cm[f]);
      await gs.clearRange(created.title, `${L}${parsed.hi + 2}:${L}2000`);
    }
    await gs.clearRange(created.title, `${gs.colLetter(parsed.idCol)}${parsed.hi + 2}:${gs.colLetter(parsed.idCol)}2000`);
    await gs.writeCells([
      { tab: created.title, range: "A1", values: [[proj.name]] },
      { tab: created.title, range: "A2", values: [["Đồng bộ với Master Plan — sửa trực tiếp tại đây hoặc trong app. Không xoá/sửa cột _id."]] },
    ]);
  } else {
    created = await gs.addBlankTab(title);
    await gs.writeCells([
      { tab: created.title, range: "A1", values: [[proj.name]] },
      { tab: created.title, range: "A3:I3", values: [["STT", "Hạng mục", "Đầu việc", "Việc con", "Deadline", "Acc", "Trạng thái", "Ghi chú", "_id"]] },
    ]);
  }
  await db().from("projects").update({ sheet_tab_name: created.title }).eq("id", proj.id);
  return created.title;
}

/**
 * Create the tab for an unlinked project (if needed) and push task rows.
 * reset=true: the App is the source of truth — wipe the tab's task rows first and rewrite them all from the App.
 */
async function pushProjectInner(projectId, { reset = false } = {}) {
    const { data: proj } = await db().from("projects").select("*").eq("id", projectId).maybeSingle();
    if (!proj) throw new Error("Không tìm thấy dự án.");
    const tab = proj.sheet_tab_name || (await createTabFor(proj));

    const parsed = parseTab((await gs.readTabs([tab]))[tab] || []);
    if (!parsed) throw new Error(`Tab "${tab}" không có bảng đầu việc hợp lệ (cần các cột Đầu việc và Trạng thái).`);
    if (reset) {
      const cols = [...Object.values(parsed.cm), parsed.idCol];
      for (const c of cols) await gs.clearRange(tab, `${gs.colLetter(c)}${parsed.headerRowNo + 1}:${gs.colLetter(c)}2000`);
      await db().from("tasks").update({ sheet_row_uid: null, sheet_hash: null }).eq("project_id", projectId);
      parsed.rows = [];
      parsed.lastUsed = parsed.headerRowNo;
    }
    const { tasks, firstSub } = await loadTasks(projectId);
    const byId = new Map(parsed.rows.filter((r) => r.id).map((r) => [r.id, r]));

    const writes = [], dbUpdates = [], conflicts = [];
    if (!parsed.idExists) writes.push({ tab, range: `${gs.colLetter(parsed.idCol)}${parsed.headerRowNo}`, values: [["_id"]] });
    let next = parsed.lastUsed + 1;
    let pushed = 0;
    const put = (rowNo, r) => {
      const cell = (f, v) => { if (parsed.cm[f] !== undefined) writes.push({ tab, range: `${gs.colLetter(parsed.cm[f])}${rowNo}`, values: [[v]] }); };
      cell("hm", r.hm); cell("dv", r.dv); cell("vc", r.vc);
      cell("dl", gs.isoToSerial(r.dl)); cell("acc", r.acc); cell("st", r.st); cell("gc", r.gc);
    };

    for (const t of tasks) {
      const r = appRow(t, firstSub);
      if (!r.dv && !r.vc) continue;
      const h = hashOf(r);
      let uid = t.sheet_row_uid, rowNo = null;
      if (uid && byId.has(uid)) {
        const cur = byId.get(uid);
        if (t.sheet_hash && hashOf(cur) !== t.sheet_hash) { conflicts.push({ tab, row: cur.rowNo, name: r.dv || r.vc }); continue; }
        if (h === t.sheet_hash) continue;
        rowNo = cur.rowNo;
      } else {
        uid = uid || crypto.randomUUID();
        rowNo = next++;
        writes.push({ tab, range: `${gs.colLetter(parsed.idCol)}${rowNo}`, values: [[uid]] });
      }
      put(rowNo, r);
      dbUpdates.push({ id: t.id, sheet_row_uid: uid, sheet_hash: h });
      pushed++;
    }

    if (writes.length) await gs.writeCells(writes);
    for (const u of dbUpdates) await db().from("tasks").update({ sheet_row_uid: u.sheet_row_uid, sheet_hash: u.sheet_hash }).eq("id", u.id);
    return { tab, pushed, conflicts };
}

export const pushProject = (projectId) => withLock(() => pushProjectInner(projectId));

/** Link an existing App project to an existing Sheet tab. The App wins: the tab's task rows are replaced by the App's. */
export async function linkExisting(projectId, tab, pendingId) {
  return withLock(async () => {
    const { data: proj } = await db().from("projects").select("id, sheet_tab_name").eq("id", projectId).maybeSingle();
    if (!proj) throw new Error("Không tìm thấy dự án.");
    if (proj.sheet_tab_name) throw new Error("Dự án này đã liên kết với một tab.");
    const { data: taken } = await db().from("projects").select("id").eq("sheet_tab_name", tab).maybeSingle();
    if (taken) throw new Error("Tab này đã liên kết với dự án khác.");
    const tabs = await gs.listTabs();
    if (!tabs.some((t) => t.title === tab)) throw new Error("Không tìm thấy tab trên Sheet.");

    await db().from("projects").update({ sheet_tab_name: tab }).eq("id", projectId);
    try {
      const r = await pushProjectInner(projectId, { reset: true });
      if (pendingId) await db().from("pending_sheet_projects").update({ status: "approved" }).eq("id", pendingId);
      return r;
    } catch (e) {
      await db().from("projects").update({ sheet_tab_name: null }).eq("id", projectId);
      throw e;
    }
  });
}

/** Extra subtasks beyond the first live only in the app (the Sheet has a single "Việc con" column). */
export async function subtaskOverflow(projectId) {
  const { tasks } = await loadTasks(projectId);
  const ids = tasks.map((t) => t.id);
  if (!ids.length) return 0;
  const { data } = await db().from("subtasks").select("task_id").in("task_id", ids);
  const per = new Map();
  (data || []).forEach((s) => per.set(s.task_id, (per.get(s.task_id) || 0) + 1));
  let extra = 0;
  per.forEach((n) => { if (n > 1) extra += n - 1; });
  return extra;
}
