"use client";
import { staffStats } from "../lib/util";

const UNASSIGNED = "(chưa gán)";

// Compact per-person strip: one chip per person with a thin done/running/overdue bar.
// Clicking a chip filters the checklist by that Acc (click again to clear).
export default function StaffChart({ tasks, active, onPick }) {
  const rows = staffStats(tasks);
  if (!rows.length) return <div className="text-xs text-slate-400">Chưa có đầu việc nào để thống kê.</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((r) => {
        const run = r.nd - r.ov, pick = r.name !== UNASSIGNED && onPick, on = active === r.name;
        const seg = (v, c) => v > 0 && <span className={c} style={{ width: `${(v / r.tot) * 100}%` }}/>;
        return (
          <button key={r.name} disabled={!pick} onClick={() => onPick(on ? "" : r.name)}
            title={`${r.name}: ${r.dn} xong · ${run} đang chạy · ${r.ov} quá hạn`}
            className={`w-36 rounded-lg px-2.5 py-1.5 text-left ring-1 ring-inset transition ${on ? "bg-indigo-50 ring-indigo-300" : "bg-white ring-slate-200 hover:bg-slate-50"} disabled:cursor-default disabled:hover:bg-white`}>
            <div className="flex items-baseline justify-between gap-1 text-xs">
              <span className={`truncate font-medium ${on ? "text-indigo-700" : "text-slate-700"}`}>{r.name}</span>
              <span className="shrink-0 tabular-nums text-slate-500">{r.dn}/{r.tot}{r.ov > 0 && <span className="ml-1 font-semibold text-rose-600">!{r.ov}</span>}</span>
            </div>
            <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
              {seg(r.dn, "bg-emerald-500")}{seg(run, "bg-blue-500")}{seg(r.ov, "bg-rose-500")}
            </div>
          </button>
        );
      })}
    </div>
  );
}
