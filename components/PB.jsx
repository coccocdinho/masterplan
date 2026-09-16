"use client";

const PAL = [
  { bg: "bg-blue-50", tx: "text-blue-800", rg: "ring-blue-200" },
  { bg: "bg-violet-50", tx: "text-violet-800", rg: "ring-violet-200" },
  { bg: "bg-teal-50", tx: "text-teal-800", rg: "ring-teal-200" },
  { bg: "bg-rose-50", tx: "text-rose-800", rg: "ring-rose-200" },
  { bg: "bg-amber-50", tx: "text-amber-800", rg: "ring-amber-200" },
  { bg: "bg-slate-100", tx: "text-slate-700", rg: "ring-slate-300" },
];
const pcol = (ps, pid) => { const i = ps.findIndex((p) => p.id === pid); return PAL[i % PAL.length] || PAL[5]; };

export default function PB({ ps, pid }) {
  const c = pcol(ps, pid), p = ps.find((x) => x.id === pid);
  return (
    <span className={`inline-block rounded-md px-2 py-1 text-xs font-semibold leading-snug ring-1 ring-inset ${c.bg} ${c.tx} ${c.rg}`}>
      {p ? p.name : "—"}
    </span>
  );
}
