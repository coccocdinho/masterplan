import "server-only";
import crypto from "crypto";
import { db } from "./db";
import { ST } from "./constants";
import { SKIP, mCol, normSt, parseDate } from "./parseSheet";
import * as gs from "./sheets";

/*
 * Sheet layout (one tab per project, one ROW per item):
 *   - Row with "Đầu việc"                      -> a task. Columns Deadline/Acc/Trạng thái/Ghi chú belong to the task.
 *   - Row with empty "Đầu việc" + "Việc con"    -> a subtask of the task above it. Its own Deadline/Acc/Trạng thái/Ghi chú.
 *   - Empty "Hạng mục"                          -> same hạng mục as the row above.
 * Every task/subtask row carries its id in the "_id" column, so rows are matched by id, never by position.
 */

const cellStr = (v) => (v == null ? "" : String(v).trim());
const isSkipTab = (t) => t.hidden || SKIP.some((s) => t.title.trim().toLowerCase() === s || t.title.trim().toLowerCase().startsWith(s));
const sq = (v) => String(v ?? "").trim().replace(/\s+/g, " ");

// ---------- hashes ----------
// v2 hashes say "this is what both sides looked like at the last sync". Whoever differs from it changed since.
const sha = (arr) => "v2:" + crypto.createHash("sha1").update(arr.map(sq).join("␟")).digest("hex").slice(0, 16);
export const hashT = (r) => sha([r.hm, r.dv, r.dl, r.acc, r.st, r.gc]);
export const hashS = (r) => sha([r.vc, r.dl, r.acc, r.st, r.gc]);
const isV2 = (h) => typeof h === "string" && h.startsWith("v2:");
// Hash format of the earlier one-row-per-task sync, kept only to migrate tasks synced before the change.
const normLines = (v) => String(v ?? "").split(/\r?\n/).map((l) => l.trim().replace(/\s+/g, " ")).filter(Boolean).join("\n");
const hashV1 = (r) => crypto.createHash("sha1").update(
  ["hm", "dv", "vc", "dl", "acc", "st", "gc"].map((f) => (f === "vc" ? normLines(r[f]) : sq(r[f]))).join("␟")
).digest("hex").slice(0, 16);

// ---------- Sheet parsing ----------
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
  const groups = [], orphanSubs = [];
  let lastHm = "", cur = null, lastUsed = hi + 1, hasInline = false;
  for (let i = hi + 1; i < values.length; i++) {
    const row = values[i] || [];
    const g = (f) => (cm[f] !== undefined ? cellStr(row[cm[f]]) : "");
    const hmRaw = g("hm");
    if (hmRaw) lastHm = hmRaw; // blank hạng mục = same as the row above
    const dlRaw = cm.dl !== undefined ? row[cm.dl] : "";
    const item = {
      rowNo: i + 1, hm: lastHm, dv: g("dv"), vc: g("vc"),
      dl: typeof dlRaw === "number" ? gs.serialToIso(dlRaw) : parseDate(cellStr(dlRaw)),
      acc: g("acc"), st: normSt(g("st")), gc: g("gc"), id: cellStr(row[idCol]),
    };
    if (item.dv) {
      cur = { t: item, subs: [] };
      groups.push(cur);
      lastUsed = i + 1;
      if (item.vc) hasInline = true;
    } else if (item.vc) {
      if (cur) cur.subs.push(item); else orphanSubs.push(item);
      lastUsed = i + 1;
    } else if (item.id) lastUsed = i + 1;
  }
  return { hi, cm, idCol, idExists, headerRowNo: hi + 1, groups, orphanSubs, lastUsed, hasInline };
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
async function loadAll(projectId) {
  const { data: tasks } = await db().from("tasks").select("*").eq("project_id", projectId);
  const ids = (tasks || []).map((t) => t.id);
  let subs = [];
  if (ids.length) subs = (await db().from("subtasks").select("*").in("task_id", ids)).data || [];
  subs.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.id).localeCompare(String(b.id)));
  const subsOf = new Map();
  subs.forEach((s) => { if (!subsOf.has(s.task_id)) subsOf.set(s.task_id, []); subsOf.get(s.task_id).push(s); });
  return { tasks: tasks || [], subs, subsOf };
}
const taskApp = (t) => ({ hm: t.hm || "", dv: t.dv || "", dl: t.dl || "", acc: t.acc || "", st: t.st || ST.N, gc: t.gc || "" });
const subApp = (s) => ({ vc: s.text || "", dl: s.dl || "", acc: s.acc || "", st: s.st || ST.N, gc: s.gc || "" });
const newStats = () => ({ created: 0, updated: 0, conflicts: [], orphans: [], missing: [], newPending: 0, errors: [] });

// ---------- Sheet -> App, one linked project ----------
async function pullProject(proj, parsed, tab, stats) {
  const { tasks, subs, subsOf } = await loadAll(proj.id);
  const tByUid = new Map(tasks.filter((t) => t.sheet_row_uid).map((t) => [t.sheet_row_uid, t]));
  const sByUid = new Map(subs.filter((s) => s.sheet_row_uid).map((s) => [s.sheet_row_uid, s]));
  const seenT = new Set(), seenS = new Set();
  const newTasks = [], newSubs = [], inlineNew = [], moves = [];
  const order = [];
  const nextPos = new Map();
  const posFor = (taskId) => {
    if (!nextPos.has(taskId)) nextPos.set(taskId, Math.max(-1, ...(subsOf.get(taskId) || []).map((s) => s.position ?? 0)) + 1);
    const p = nextPos.get(taskId);
    nextPos.set(taskId, p + 1);
    return p;
  };
  const upd = async (table, id, patch) => {
    const { error } = await db().from(table).update(patch).eq("id", id);
    if (error) throw new Error("Không cập nhật được dữ liệu từ Sheet.");
    stats.updated++;
  };

  for (const g of parsed.groups) {
    const T = g.t;
    let id = T.id;
    if (id && seenT.has(id)) id = ""; // duplicated row -> treat as new
    if (id) {
      seenT.add(id);
      const t = tByUid.get(id);
      if (!t) { stats.orphans.push({ tab, row: T.rowNo, name: T.dv }); continue; }
      order.push(id);
      const patch = { hm: T.hm, dv: T.dv, dl: T.dl || null, acc: T.acc, st: T.st, gc: T.gc, sheet_hash: hashT(T) };
      if (isV2(t.sheet_hash)) {
        if (patch.sheet_hash !== t.sheet_hash) {
          if (hashT(taskApp(t)) !== t.sheet_hash) stats.conflicts.push({ tab, row: T.rowNo, name: T.dv });
          else await upd("tasks", t.id, patch);
        }
      } else if (t.sheet_hash) {
        // Synced before the one-row-per-item layout: use the old hash to tell who changed, then move to v2.
        if (hashV1(T) !== t.sheet_hash) {
          const texts = (subsOf.get(t.id) || []).map((s) => sq(s.text)).filter(Boolean);
          const appSame = [texts.join("\n"), texts[0] || ""].some((vc) => hashV1({ ...taskApp(t), vc }) === t.sheet_hash);
          if (appSame) await upd("tasks", t.id, patch); else stats.conflicts.push({ tab, row: T.rowNo, name: T.dv });
        }
      }
      // Text typed into the task row's "Việc con" cell (old habit / old layout): make it a subtask once, idempotently.
      if (T.vc) {
        for (const line of T.vc.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
          const has = (subsOf.get(t.id) || []).some((s) => sq(s.text) === sq(line)) || inlineNew.some((x) => x.taskId === t.id && sq(x.text) === sq(line));
          if (!has) inlineNew.push({ taskId: t.id, text: line });
        }
      }
      for (const S of g.subs) {
        let sid = S.id;
        if (sid && seenS.has(sid)) sid = "";
        if (sid) {
          seenS.add(sid);
          const s = sByUid.get(sid);
          if (!s) { stats.orphans.push({ tab, row: S.rowNo, name: S.vc }); continue; }
          if (s.task_id !== t.id) { await upd("subtasks", s.id, { task_id: t.id }); s.task_id = t.id; }
          const h = hashS(S);
          if (isV2(s.sheet_hash) && h !== s.sheet_hash) {
            if (hashS(subApp(s)) !== s.sheet_hash) stats.conflicts.push({ tab, row: S.rowNo, name: S.vc });
            else await upd("subtasks", s.id, { text: S.vc, dl: S.dl || null, acc: S.acc, st: S.st, gc: S.gc, sheet_hash: h });
          }
        } else {
          newSubs.push({ S, taskId: t.id, uid: crypto.randomUUID() });
        }
      }
    } else {
      const uid = crypto.randomUUID();
      newTasks.push({ g, uid });
      order.push(uid);
    }
  }
  parsed.orphanSubs.forEach((S) => stats.orphans.push({ tab, row: S.rowNo, name: S.vc }));

  const idWrites = [];
  const idCell = (rowNo, uid) => idWrites.push({ tab, range: `${gs.colLetter(parsed.idCol)}${rowNo}`, values: [[uid]] });
  const createdTaskUids = [], createdSubUids = [];

  if (newTasks.length || newSubs.length || inlineNew.length) {
    let idByUid = new Map();
    if (newTasks.length) {
      const { data: created, error } = await db().from("tasks").insert(
        newTasks.map(({ g, uid }) => ({
          project_id: proj.id, created_by: null, hm: g.t.hm, dv: g.t.dv, dl: g.t.dl || null,
          acc: g.t.acc, st: g.t.st, gc: g.t.gc, sheet_row_uid: uid, sheet_hash: hashT(g.t),
        }))
      ).select();
      if (error) throw new Error("Không tạo được đầu việc từ Sheet.");
      idByUid = new Map(created.map((t) => [t.sheet_row_uid, t.id]));
      newTasks.forEach(({ g, uid }) => { createdTaskUids.push(uid); idCell(g.t.rowNo, uid); });
    }
    const subRows = [];
    newTasks.forEach(({ g, uid }) => {
      const taskId = idByUid.get(uid);
      let p = 0;
      if (g.t.vc) g.t.vc.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((text) => subRows.push({ task_id: taskId, text, st: ST.N, position: p++ }));
      g.subs.forEach((S) => {
        if (S.id && !seenS.has(S.id) && sByUid.has(S.id)) { seenS.add(S.id); moves.push({ sub: sByUid.get(S.id), taskId }); return; }
        const sid = crypto.randomUUID();
        subRows.push({ task_id: taskId, text: S.vc, dl: S.dl || null, acc: S.acc, st: S.st, gc: S.gc, position: p++, sheet_row_uid: sid, sheet_hash: hashS(S) });
        createdSubUids.push(sid); idCell(S.rowNo, sid);
      });
    });
    newSubs.forEach(({ S, taskId, uid }) => {
      subRows.push({ task_id: taskId, text: S.vc, dl: S.dl || null, acc: S.acc, st: S.st, gc: S.gc, position: posFor(taskId), sheet_row_uid: uid, sheet_hash: hashS(S) });
      createdSubUids.push(uid); idCell(S.rowNo, uid);
    });
    inlineNew.forEach(({ taskId, text }) => subRows.push({ task_id: taskId, text, st: ST.N, position: posFor(taskId) }));
    if (subRows.length) {
      const { error } = await db().from("subtasks").insert(subRows);
      if (error) {
        if (createdTaskUids.length) await db().from("tasks").delete().in("sheet_row_uid", createdTaskUids);
        throw new Error("Không tạo được việc con từ Sheet.");
      }
    }
    for (const m of moves) await upd("subtasks", m.sub.id, { task_id: m.taskId });
    stats.created += newTasks.length + subRows.length;
  }

  const writes = [...idWrites];
  if (!parsed.idExists && (parsed.groups.length || parsed.orphanSubs.length)) writes.push({ tab, range: `${gs.colLetter(parsed.idCol)}${parsed.headerRowNo}`, values: [["_id"]] });
  if (writes.length) {
    try {
      await gs.writeCells(writes);
    } catch (e) {
      // Sheet ids couldn't be written back: undo the inserts so a retry can't duplicate rows.
      if (createdTaskUids.length) await db().from("tasks").delete().in("sheet_row_uid", createdTaskUids);
      if (createdSubUids.length) await db().from("subtasks").delete().in("sheet_row_uid", createdSubUids);
      throw e;
    }
  }
  return { order };
}

/** Pull every linked tab, queue unknown tabs for review. */
export async function pullAll() {
  return withLock(async () => {
    const stats = newStats();
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
          await pullProject(proj, parsed, t.title, stats);
        } else {
          const prev = (pend || []).find((p) => p.source_tab_name === t.title);
          if (prev && (prev.status === "pending" || prev.status === "rejected")) continue;
          const snapshot = { rowCount: parsed.groups.length, sample: parsed.groups.slice(0, 5).map((g) => g.t.dv) };
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
    const stats = newStats();
    try {
      const parsed = parseTab((await gs.readTabs([tab]))[tab] || []);
      if (!parsed) throw new Error("Tab không có bảng đầu việc hợp lệ.");
      await pullProject(proj, parsed, tab, stats);
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
const NOTE = "Mỗi đầu việc / việc con một dòng. Để trống Hạng mục = cùng hạng mục dòng trên; để trống Đầu việc (có Việc con) = việc con của đầu việc phía trên. Đồng bộ với Master Plan — không xoá/sửa cột _id.";

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
    const cols = [...Object.values(parsed.cm), parsed.idCol];
    await gs.clearRanges(created.title, cols.map((c) => `${gs.colLetter(c)}${parsed.hi + 2}:${gs.colLetter(c)}2000`));
    await gs.writeCells([
      { tab: created.title, range: "A1", values: [[proj.name]] },
      { tab: created.title, range: "A2", values: [[NOTE]] },
    ]);
  } else {
    created = await gs.addBlankTab(title);
    await gs.writeCells([
      { tab: created.title, range: "A1", values: [[proj.name]] },
      { tab: created.title, range: "A2", values: [[NOTE]] },
      { tab: created.title, range: "A3:I3", values: [["STT", "Hạng mục", "Đầu việc", "Việc con", "Deadline", "Acc", "Trạng thái", "Ghi chú", "_id"]] },
    ]);
  }
  await db().from("projects").update({ sheet_tab_name: created.title }).eq("id", proj.id);
  return created.title;
}

async function saveMeta(rows) {
  const tUp = [], sUp = [];
  for (const r of rows) {
    if (r.rec.sheet_row_uid === r.id && r.rec.sheet_hash === r.hash) continue;
    if (r.kind === "t") tUp.push({ id: r.rec.id, project_id: r.rec.project_id, sheet_row_uid: r.id, sheet_hash: r.hash });
    else sUp.push({ id: r.rec.id, task_id: r.rec.task_id, sheet_row_uid: r.id, sheet_hash: r.hash });
  }
  for (const [table, list] of [["tasks", tUp], ["subtasks", sUp]]) {
    for (let i = 0; i < list.length; i += 200) {
      const { error } = await db().from(table).upsert(list.slice(i, i + 200), { onConflict: "id" });
      if (error) throw new Error("Không lưu được thông tin đồng bộ.");
    }
  }
}

/**
 * Create the tab for an unlinked project (if needed) and lay every task/subtask out on it.
 * The App is the master: Sheet edits that don't clash are pulled in first; anything both sides changed is overwritten by the App.
 * reset=true: also wipe the tab's existing task rows first (used when linking an existing tab).
 */
async function pushProjectInner(projectId, { reset = false } = {}) {
  const { data: proj } = await db().from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!proj) throw new Error("Không tìm thấy dự án.");
  const tab = proj.sheet_tab_name || (await createTabFor(proj));

  const parsed = parseTab((await gs.readTabs([tab]))[tab] || []);
  if (!parsed) throw new Error(`Tab "${tab}" không có bảng đầu việc hợp lệ (cần các cột Đầu việc và Trạng thái).`);
  const stats = newStats();
  let order = [];
  if (reset) {
    const { data: ts } = await db().from("tasks").select("id").eq("project_id", projectId);
    const ids = (ts || []).map((t) => t.id);
    await db().from("tasks").update({ sheet_row_uid: null, sheet_hash: null }).eq("project_id", projectId);
    if (ids.length) await db().from("subtasks").update({ sheet_row_uid: null, sheet_hash: null }).in("task_id", ids);
    parsed.groups = []; parsed.orphanSubs = []; parsed.hasInline = false; parsed.idExists = false;
  } else {
    order = (await pullProject(proj, parsed, tab, stats)).order;
  }

  // Desired layout, from the App.
  const { tasks, subsOf } = await loadAll(projectId);
  const idx = new Map(order.map((u, i) => [u, i]));
  const inSheet = (t) => t.sheet_row_uid && idx.has(t.sheet_row_uid);
  const ordered = [
    ...tasks.filter(inSheet).sort((a, b) => idx.get(a.sheet_row_uid) - idx.get(b.sheet_row_uid)),
    ...tasks.filter((t) => !inSheet(t)),
  ].filter((t) => (t.dv || "").trim());
  // Tasks without a hạng mục go first: a blank cell means "same as the row above", so they must not follow a group.
  const final = [...ordered.filter((t) => !(t.hm || "").trim()), ...ordered.filter((t) => (t.hm || "").trim())];

  const rows = [];
  let lastHm = "";
  for (const t of final) {
    const hm = (t.hm || "").trim();
    const written = hm && hm !== lastHm ? hm : "";
    if (hm) lastHm = hm;
    rows.push({
      kind: "t", rec: t, id: t.sheet_row_uid || crypto.randomUUID(),
      cells: { hm: written, dv: t.dv, vc: "", dl: t.dl || "", acc: t.acc || "", st: t.st || ST.N, gc: t.gc || "" },
      hash: hashT({ ...taskApp(t), hm: hm || lastHm }),
    });
    for (const s of (subsOf.get(t.id) || []).filter((x) => (x.text || "").trim())) {
      rows.push({
        kind: "s", rec: s, id: s.sheet_row_uid || crypto.randomUUID(),
        cells: { hm: "", dv: "", vc: s.text, dl: s.dl || "", acc: s.acc || "", st: s.st || ST.N, gc: s.gc || "" },
        hash: hashS(subApp(s)),
      });
    }
  }

  const current = parsed.groups.flatMap((g) => [{ id: g.t.id, hash: hashT(g.t) }, ...g.subs.map((s) => ({ id: s.id, hash: hashS(s) }))]);
  const same = !reset && parsed.idExists && !parsed.hasInline && !parsed.orphanSubs.length && current.length === rows.length
    && rows.every((r, i) => r.id === current[i].id && r.hash === current[i].hash);
  if (same) {
    await saveMeta(rows);
    return { tab, pushed: 0, conflicts: stats.conflicts };
  }

  const start = parsed.headerRowNo + 1;
  if (start + rows.length > 1990) throw new Error("Tab quá dài để đồng bộ (tối đa ~1990 dòng).");
  const cols = Object.entries(parsed.cm).map(([f, c]) => [f, c]).sort((a, b) => a[1] - b[1]);
  const minC = cols[0][1], maxC = cols[cols.length - 1][1];
  const contiguous = maxC - minC + 1 === cols.length;
  const valOf = (f, cells) => (f === "dl" ? gs.isoToSerial(cells.dl) : cells[f]);

  await gs.clearRanges(tab, [...cols.map(([, c]) => c), parsed.idCol].map((c) => `${gs.colLetter(c)}${start}:${gs.colLetter(c)}2000`));
  const writes = [];
  if (!parsed.idExists) writes.push({ tab, range: `${gs.colLetter(parsed.idCol)}${parsed.headerRowNo}`, values: [["_id"]] });
  rows.forEach((r, i) => {
    const rowNo = start + i;
    if (contiguous) writes.push({ tab, range: `${gs.colLetter(minC)}${rowNo}:${gs.colLetter(maxC)}${rowNo}`, values: [cols.map(([f]) => valOf(f, r.cells))] });
    else cols.forEach(([f, c]) => writes.push({ tab, range: `${gs.colLetter(c)}${rowNo}`, values: [[valOf(f, r.cells)]] }));
    writes.push({ tab, range: `${gs.colLetter(parsed.idCol)}${rowNo}`, values: [[r.id]] });
  });
  await gs.writeCells(writes);
  const gid = (await gs.listTabs()).find((t) => t.title === tab)?.gid;
  const wrapCols = ["hm", "dv", "vc", "gc"].map((f) => parsed.cm[f]).filter((c) => c !== undefined);
  if (gid !== undefined && wrapCols.length) await gs.wrapColumns(gid, wrapCols, parsed.headerRowNo).catch(() => {});
  await saveMeta(rows);
  return { tab, pushed: rows.length, conflicts: stats.conflicts };
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
