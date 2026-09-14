"use client";
import { AlertTriangle, Clock, CalendarClock, Circle, CheckCircle2 } from "lucide-react";
import { urg, ddiff } from "../lib/util";

const UU = {
  over: { lb: (d) => `Quá hạn ${Math.abs(d)} ngày`, bg: "bg-rose-50", tx: "text-rose-700", rg: "ring-rose-200", Ic: AlertTriangle },
  today: { lb: () => "Đến hạn hôm nay", bg: "bg-orange-50", tx: "text-orange-700", rg: "ring-orange-200", Ic: Clock },
  soon: { lb: (d) => `Còn ${d} ngày`, bg: "bg-amber-50", tx: "text-amber-700", rg: "ring-amber-200", Ic: CalendarClock },
  ok: { lb: (d) => `Còn ${d} ngày`, bg: "bg-emerald-50", tx: "text-emerald-700", rg: "ring-emerald-200", Ic: Circle },
  done: { lb: () => "Đã xong", bg: "bg-slate-100", tx: "text-slate-500", rg: "ring-slate-200", Ic: CheckCircle2 },
  none: { lb: () => "Chưa có deadline", bg: "bg-slate-50", tx: "text-slate-400", rg: "ring-slate-200", Ic: Circle },
};

export default function UB({ t }) {
  const lv = urg(t), dd = ddiff(t.dl), s = UU[lv], I = s.Ic;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.bg} ${s.tx} ${s.rg}`}>
      <I size={11} strokeWidth={2.5}/>{s.lb(dd)}
    </span>
  );
}
