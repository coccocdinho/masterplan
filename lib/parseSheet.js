import { ST } from "./constants";

// Ported from the Vite prototype's src/App.jsx (extractWb/mCol/FM/SKIP/normSt/parseDate).
export const SKIP = [
  "hướng dẫn", "tổng hợp", "cần đôn đốc", "cần đôn đốc hôm nay",
  "_staging", "staging", "dashboard", "overview", "summary",
];
export const FM = {
  dv: ["đầu việc", "dau viec"],
  vc: ["việc con", "viec con"],
  hm: ["hạng mục", "hang muc"],
  dl: ["deadline", "hạn", "han"],
  acc: ["acc"],
  st: ["trạng thái", "trang thai"],
  gc: ["ghi chú", "ghi chu"],
};

export function mCol(c) {
  const n = String(c || "").trim().toLowerCase();
  for (const [f, ks] of Object.entries(FM)) if (ks.some((k) => n === k)) return f;
  return null;
}

export function normSt(r) {
  const s = (r || "").trim().toLowerCase();
  if (s.includes("hoàn thành") || s === "xong") return ST.D;
  if (s.includes("đang")) return ST.I;
  return ST.N;
}

export function parseDate(r) {
  if (!r) return "";
  const s = String(r).trim();
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return "";
}

/** wb: an XLSX.WorkBook (from xlsx). Returns [{name, count, tasks:[{hm,dv,vc,dl,acc,st,gc}]}] — one entry per project-shaped sheet tab. */
export function extractWb(wb, XLSX) {
  const out = [];
  wb.SheetNames.forEach((nm, i) => {
    const meta = wb.Workbook?.Sheets?.[i];
    const lower = nm.trim().toLowerCase();
    if (meta?.Hidden || SKIP.some((s) => lower === s || lower.startsWith(s))) return;
    const sh = wb.Sheets[nm];
    if (!sh) return;
    const rows = XLSX.utils.sheet_to_json(sh, { header: 1, raw: false, defval: "" });
    let hi = -1, cm = {};
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const m = {};
      (rows[i] || []).forEach((c, ci) => {
        const f = mCol(c);
        if (f && m[f] === undefined) m[f] = ci;
      });
      if (m.dv !== undefined && m.st !== undefined) { hi = i; cm = m; break; }
    }
    if (hi === -1) return;
    const tasks = [];
    for (let i = hi + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const g = (f) => (cm[f] !== undefined ? String(row[cm[f]] || "").trim() : "");
      const dv = g("dv"), vc = g("vc");
      if (!dv && !vc) continue;
      tasks.push({ hm: g("hm"), dv, vc, dl: parseDate(g("dl")), acc: g("acc"), st: normSt(g("st")), gc: g("gc") });
    }
    out.push({ name: nm, count: tasks.length, tasks });
  });
  return out;
}
