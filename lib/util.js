import { ST, STO } from "./constants";

// Ported near-verbatim from the Vite prototype's src/App.jsx. The client-side
// shape of {users,projects,tasks,logs} is kept identical to the old localStorage
// blob (task.pid, project.owner, log.ac/an/ar/tn/dt, ...) — API routes translate
// to/from the DB's more verbose column names, so every function below is reused as-is.

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
export function day() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function ddiff(dl) {
  if (!dl) return null;
  const a = new Date(dl + "T00:00:00"), b = new Date(day() + "T00:00:00");
  return isNaN(a) ? null : Math.round((a - b) / 864e5);
}
export function done(t) { return t.st === ST.D; }
export function blankSub(text) {
  return { id: uid(), text: (text || "").trim(), dl: "", acc: "", st: ST.N, gc: "" };
}
export function hasC(t) {
  return !!((t.dv || "").trim() || (t.subtasks || []).some((s) => (s.text || "").trim()));
}
export function urg(t) {
  if (done(t)) return "done";
  const d = ddiff(t.dl);
  if (d === null) return "none";
  if (d < 0) return "over";
  if (d === 0) return "today";
  if (d <= 3) return "soon";
  return "ok";
}
export function fmtD(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}
export function fmtDT(ts) {
  if (!ts) return "";
  const d = new Date(ts), p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function stats(tasks, pid) {
  const ts = tasks.filter((t) => t.pid === pid && hasC(t));
  const tot = ts.length, dn = ts.filter(done).length;
  return {
    tot, dn, nd: tot - dn,
    ov: ts.filter((t) => urg(t) === "over").length,
    td: ts.filter((t) => urg(t) === "today").length,
    sn: ts.filter((t) => urg(t) === "soon").length,
  };
}
export function projDone(tasks, pid) {
  const s = stats(tasks, pid);
  return s.tot > 0 && s.dn === s.tot;
}
export function projOverdue(p, tasks) {
  if (!p.dl) return false;
  const d = ddiff(p.dl);
  return d !== null && d < 0 && !projDone(tasks, p.id);
}
export function pstats(d) {
  const vt = d.tasks.filter(hasC), tot = vt.length, dn = vt.filter(done).length, ip = vt.filter((t) => t.st === ST.I).length;
  return {
    tot, dn, ip, ns: tot - dn - ip,
    ov: vt.filter((t) => urg(t) === "over").length,
    td: vt.filter((t) => urg(t) === "today").length,
    sn: vt.filter((t) => urg(t) === "soon").length,
    run: d.projects.filter((p) => { const s = stats(d.tasks, p.id); return s.nd > 0 || s.tot === 0; }).length,
    ovP: d.projects.filter((p) => projOverdue(p, d.tasks)).length,
  };
}
export function ownerName(D, ownerId) {
  const u = (D.users || []).find((x) => x.id === ownerId);
  return u ? u.username : "Chưa gán";
}
export function staffStats(tasks) {
  const ts = tasks.filter(hasC);
  const map = new Map();
  const bump = (name) => {
    if (!map.has(name)) map.set(name, { name, tot: 0, dn: 0, nd: 0, ov: 0 });
    return map.get(name);
  };
  ts.forEach((t) => {
    const names = (t.acc || "").split(",").map((s) => s.trim()).filter(Boolean);
    const list = names.length ? names : ["(chưa gán)"];
    const isDone = done(t), isOver = urg(t) === "over";
    list.forEach((nm) => {
      const row = bump(nm);
      row.tot += 1;
      if (isDone) row.dn += 1; else row.nd += 1;
      if (isOver) row.ov += 1;
    });
  });
  return [...map.values()].sort((a, b) => b.ov - a.ov || b.tot - a.tot);
}
export function globalStaffStats(d) {
  const map = new Map();
  const bump = (name) => {
    if (!map.has(name)) map.set(name, { name, tot: 0, dn: 0, nd: 0, ov: 0, pids: new Set() });
    return map.get(name);
  };
  d.tasks.filter(hasC).forEach((t) => {
    const names = (t.acc || "").split(",").map((s) => s.trim()).filter(Boolean);
    const list = names.length ? names : ["(chưa gán)"];
    const isDone = done(t), isOver = urg(t) === "over";
    list.forEach((nm) => {
      const row = bump(nm);
      row.tot += 1; row.pids.add(t.pid);
      if (isDone) row.dn += 1; else row.nd += 1;
      if (isOver) row.ov += 1;
    });
  });
  return [...map.values()].map((r) => ({ ...r, projCount: r.pids.size })).sort((a, b) => b.ov - a.ov || b.tot - a.tot);
}
export function ownerStats(d) {
  const map = new Map();
  d.projects.forEach((p) => {
    const key = p.owner || "";
    if (!map.has(key)) map.set(key, { ownerId: key, name: ownerName(d, key), done: 0, running: 0, overdue: 0, total: 0 });
    const row = map.get(key);
    const over = projOverdue(p, d.tasks);
    const fin = projDone(d.tasks, p.id);
    row.total += 1;
    if (over) row.overdue += 1; else if (fin) row.done += 1; else row.running += 1;
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}
export function rowSt(t) {
  if (done(t)) return { bg: "bg-slate-50/60", bd: "border-l-4 border-l-emerald-300" };
  const u = urg(t);
  if (u === "over") return { bg: "bg-rose-50/50", bd: "border-l-4 border-l-rose-500" };
  if (u === "today") return { bg: "bg-orange-50/40", bd: "border-l-4 border-l-orange-500" };
  if (u === "soon") return { bg: "bg-amber-50/30", bd: "border-l-4 border-l-amber-400" };
  return { bg: "", bd: "border-l-4 border-l-transparent" };
}
export function niceStep(raw) {
  if (!raw || raw <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
}
export function roundedTopPath(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}
export function truncLabel(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
export function cmpStr(a, b) { return (a || "").localeCompare(b || ""); }
export function cmpDl(a, b) { const av = a || "9999-99-99", bv = b || "9999-99-99"; return av < bv ? -1 : av > bv ? 1 : 0; }
export function stRank(s) { const i = STO.indexOf(s); return i === -1 ? 99 : i; }
export function urgKey(t) { if (done(t)) return Infinity; const d = ddiff(t.dl); return d === null ? 1e8 : d; }
export const TASK_SORTERS = {
  hm: (a, b) => cmpStr(a.hm, b.hm),
  dv: (a, b) => cmpStr(a.dv, b.dv),
  dl: (a, b) => cmpDl(a.dl, b.dl),
  acc: (a, b) => cmpStr(a.acc, b.acc),
  st: (a, b) => stRank(a.st) - stRank(b.st),
  urg: (a, b) => urgKey(a) - urgKey(b),
  gc: (a, b) => cmpStr(a.gc, b.gc),
};

const LM = {
  cp: { l: "Tạo dự án", c: "text-emerald-700", b: "bg-emerald-50" },
  dp: { l: "Xoá dự án", c: "text-rose-700", b: "bg-rose-50" },
  ct: { l: "Tạo đầu việc", c: "text-blue-700", b: "bg-blue-50" },
  dt: { l: "Xoá đầu việc", c: "text-rose-700", b: "bg-rose-50" },
  ip: { l: "Nhập dự án", c: "text-indigo-700", b: "bg-indigo-50" },
  au: { l: "Thêm tài khoản", c: "text-teal-700", b: "bg-teal-50" },
  du: { l: "Xoá tài khoản", c: "text-rose-700", b: "bg-rose-50" },
  rp: { l: "Reset mật khẩu", c: "text-amber-700", b: "bg-amber-50" },
};
export { LM };
