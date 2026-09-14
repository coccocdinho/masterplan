"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { hasC, ddiff, fmtD } from "../lib/util";
import { STO } from "../lib/constants";
import PB from "./PB";
import SP from "./SP";
import UB from "./UB";

export default function StaffDetail({ D, name, onClose }) {
  const [stF, setStF] = useState("");
  let rows = D.tasks.filter(hasC).filter((t) => {
    const names = (t.acc || "").split(",").map((s) => s.trim()).filter(Boolean);
    return names.length ? names.includes(name) : name === "(chưa gán)";
  });
  if (stF) rows = rows.filter((t) => t.st === stF);
  rows = rows.slice().sort((a, b) => { const da = ddiff(a.dl), db = ddiff(b.dl); return (da === null ? 1e9 : da) - (db === null ? 1e9 : db); });

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-800">Công việc của {name} <span className="font-normal text-slate-400">({rows.length})</span></h3>
        <div className="flex items-center gap-2">
          <select value={stF} onChange={(e) => setStF(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none">
            <option value="">Trạng thái: Tất cả</option>
            {STO.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={16}/></button>
        </div>
      </div>
      <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-slate-100">
        {!rows.length ? <div className="px-4 py-8 text-center text-sm text-slate-400">Không có việc nào khớp.</div> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0"><tr className="border-b border-slate-200 bg-slate-50 text-left uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-medium">Dự án</th>
              <th className="px-3 py-2 font-medium">Đầu việc / Việc con</th>
              <th className="px-3 py-2 font-medium">Deadline</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
              <th className="px-3 py-2 font-medium">Tình trạng deadline</th>
            </tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0 align-top">
                <td className="px-3 py-2"><PB ps={D.projects} pid={t.pid}/></td>
                <td className="px-3 py-2"><div className="font-medium text-slate-800">{t.dv || "—"}</div></td>
                <td className="px-3 py-2 tabular-nums text-slate-600">{fmtD(t.dl) || "—"}</td>
                <td className="px-3 py-2"><SP val={t.st}/></td>
                <td className="px-3 py-2"><UB t={t}/></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
