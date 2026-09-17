"use client";
import { Circle, Clock, CheckCircle2 } from "lucide-react";
import { ST, STO } from "../lib/constants";

const SM = {
  [ST.N]: { Ic: Circle, bg: "bg-slate-200", tx: "text-slate-700", rg: "ring-slate-300" },
  [ST.I]: { Ic: Clock, bg: "bg-blue-100", tx: "text-blue-800", rg: "ring-blue-300" },
  [ST.D]: { Ic: CheckCircle2, bg: "bg-emerald-100", tx: "text-emerald-800", rg: "ring-emerald-300" },
};

export default function SP({ val, onChange }) {
  const m = SM[val] || SM[ST.N], I = m.Ic;
  return (
    <div className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${m.bg} ${m.tx} ${m.rg}`}>
      <I size={12} strokeWidth={2.5}/><span>{val}</span>
      {onChange && (
        <select value={val} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
          {STO.map((o) => <option key={o}>{o}</option>)}
        </select>
      )}
    </div>
  );
}
