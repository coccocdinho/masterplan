"use client";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, CalendarClock, ChevronRight } from "lucide-react";
import { hasC, urg, ddiff, fmtD, rowSt } from "../lib/util";
import KPI from "./KPI";
import PB from "./PB";
import UB from "./UB";

export default function Urgent({ D }) {
  const router = useRouter();
  const ts = D.tasks.filter((t) => hasC(t) && ["over", "today", "soon"].includes(urg(t))).sort((a, b) => ddiff(a.dl) - ddiff(b.dl));
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <h1 className="text-xl font-bold text-slate-900">Cần đôn đốc hôm nay</h1>
      <p className="mt-0.5 text-sm text-slate-500">Quá hạn, đến hạn hôm nay, hoặc còn ≤3 ngày.</p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <KPI Ic={AlertTriangle} label="Quá hạn" val={ts.filter(t=>urg(t)==="over").length} tone="ro"/>
        <KPI Ic={Clock} label="Đến hạn hôm nay" val={ts.filter(t=>urg(t)==="today").length} tone="or"/>
        <KPI Ic={CalendarClock} label="Sắp đến hạn (≤3 ngày)" val={ts.filter(t=>urg(t)==="soon").length} tone="am"/>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!ts.length ? <div className="px-5 py-12 text-center text-sm text-slate-400">Không có việc cần đôn đốc.</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b-2 border-indigo-200 bg-indigo-50/70 text-left text-xs uppercase tracking-wide text-indigo-900">
              <th className="w-12 px-4 py-2.5 font-medium">#</th>
              <th className="w-44 px-4 py-2.5 font-medium">Dự án</th>
              <th className="px-4 py-2.5 font-medium">Đầu việc / Việc con</th>
              <th className="w-28 px-4 py-2.5 font-medium">Acc</th>
              <th className="w-28 px-4 py-2.5 font-medium">Deadline</th>
              <th className="w-44 px-4 py-2.5 font-medium">Mức độ</th>
              <th className="w-8"/>
            </tr></thead>
            <tbody>{ts.map((t, i) => {
              const rs = rowSt(t);
              return (
                <tr key={t.id} onClick={() => router.push(`/project/${t.pid}?hl=${t.id}`)} className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 ${rs.bg} ${rs.bd}`}>
                  <td className="px-4 py-3.5 tabular-nums font-medium text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3.5"><PB ps={D.projects} pid={t.pid}/></td>
                  <td className="px-4 py-3.5"><div className="font-medium text-slate-800">{t.dv || <span className="text-slate-400">—</span>}</div></td>
                  <td className="px-4 py-3.5 text-slate-600">{t.acc || "—"}</td>
                  <td className="px-4 py-3.5 tabular-nums text-slate-600">{fmtD(t.dl)}</td>
                  <td className="px-4 py-3.5"><UB t={t}/></td>
                  <td className="px-4 py-3.5 text-slate-300"><ChevronRight size={16}/></td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
