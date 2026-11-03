"use client";
import { Circle, AlertTriangle, Flame } from "lucide-react";
import { PR, PRO } from "../lib/constants";

const PM = {
  [PR.N]: { Ic: Circle, bg: "bg-slate-100", tx: "text-slate-600", rg: "ring-slate-200" },
  [PR.U]: { Ic: AlertTriangle, bg: "bg-amber-100", tx: "text-amber-800", rg: "ring-amber-300" },
  [PR.R]: { Ic: Flame, bg: "bg-rose-100", tx: "text-rose-800", rg: "ring-rose-300" },
};

export default function PrB({ val, onChange }) {
  const m = PM[val] || PM[PR.N], I = m.Ic;
  return (
    <div className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${m.bg} ${m.tx} ${m.rg}`}>
      <I size={12} strokeWidth={2.5}/><span>{val}</span>
      {onChange && (
        <select value={val} onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()} className="absolute inset-0 cursor-pointer opacity-0">
          {PRO.map((o) => <option key={o}>{o}</option>)}
        </select>
      )}
    </div>
  );
}
