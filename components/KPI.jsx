"use client";

export default function KPI({ Ic, label, val, tone }) {
  const T = {
    in: { bg: "bg-indigo-50", ic: "text-indigo-600", n: "text-slate-900" },
    ro: { bg: "bg-rose-50", ic: "text-rose-600", n: val > 0 ? "text-rose-600" : "text-slate-900" },
    or: { bg: "bg-orange-50", ic: "text-orange-600", n: val > 0 ? "text-orange-600" : "text-slate-900" },
    am: { bg: "bg-amber-50", ic: "text-amber-600", n: val > 0 ? "text-amber-600" : "text-slate-900" },
  }[tone] || { bg: "bg-slate-100", ic: "text-slate-600", n: "text-slate-900" };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${T.bg}`}><Ic size={17} className={T.ic} strokeWidth={2.2}/></div>
      <div><div className={`text-xl font-bold tabular-nums leading-tight ${T.n}`}>{val}</div><div className="mt-0.5 truncate text-xs text-slate-500">{label}</div></div>
    </div>
  );
}
