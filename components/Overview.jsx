"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderPlus, FileSpreadsheet, Plus, FolderKanban, ShieldAlert, AlertTriangle,
  Clock, CalendarClock, Search, ChevronRight,
} from "lucide-react";
import { stats, pstats, ownerStats, ownerName, projOverdue, fmtD } from "../lib/util";
import KPI from "./KPI";
import StackChart from "./StackChart";

export default function Overview({ D, onNew, onImp }) {
  const router = useRouter();
  const [q, sq] = useState(""), [showDone, setSD] = useState(false);
  const s = pstats(D);
  const aIds = new Set(D.projects.filter((p) => { const x = stats(D.tasks, p.id); return x.nd > 0 || x.tot === 0; }).map((p) => p.id));
  let vis = showDone ? D.projects : D.projects.filter((p) => aIds.has(p.id));
  if (q.trim()) {
    const qn = q.trim().toLowerCase();
    vis = vis.filter((p) => p.name.toLowerCase().includes(qn) || ownerName(D, p.owner).toLowerCase().includes(qn));
  }
  const ownRows = ownerStats(D);

  if (!D.projects.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FolderPlus className="mx-auto mb-4 text-slate-300" size={40}/>
          <h2 className="text-lg font-semibold text-slate-800">Chưa có dự án nào</h2>
          <p className="mt-1 text-sm text-slate-500">Tạo dự án đầu tiên hoặc nhập từ file Excel.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={onImp} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><FileSpreadsheet size={15}/> Nhập từ Excel</button>
            <button onClick={onNew} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"><Plus size={16} strokeWidth={2.5}/> Tạo dự án mới</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold text-slate-900">Tổng quan</h1><p className="mt-0.5 text-sm text-slate-500">Toàn cảnh các dự án và tiến độ đầu việc.</p></div>
        <div className="flex gap-2">
          <button onClick={onImp} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><FileSpreadsheet size={15}/> Nhập từ Excel</button>
          <button onClick={onNew} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"><Plus size={16} strokeWidth={2.5}/> Tạo dự án mới</button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KPI Ic={FolderKanban} label="Dự án đang chạy" val={s.run} tone="in"/>
        <KPI Ic={ShieldAlert} label="Dự án quá hạn" val={s.ovP} tone="ro"/>
        <KPI Ic={AlertTriangle} label="Việc quá hạn" val={s.ov} tone="ro"/>
        <KPI Ic={Clock} label="Đến hạn hôm nay" val={s.td} tone="or"/>
        <KPI Ic={CalendarClock} label="Sắp đến hạn (≤3 ngày)" val={s.sn} tone="am"/>
      </div>
      <div className="mt-4"><StackChart title="Dự án theo người chủ trì" rows={ownRows} empty="Chưa có dự án nào."/></div>
      <div className="mt-7 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Danh sách dự án</h2>
        <div className="flex items-center gap-3">
          <div className="relative"><Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/><input value={q} onChange={e=>sq(e.target.value)} placeholder="Tìm dự án…" className="w-44 rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"/></div>
          <label className="flex items-center gap-2 text-sm text-slate-500"><input type="checkbox" checked={showDone} onChange={e=>setSD(e.target.checked)} className="rounded border-slate-300 text-indigo-600"/> Hiện dự án đã xong</label>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b-2 border-indigo-200 bg-indigo-100/70 text-left text-xs uppercase tracking-wide text-indigo-800">
            <th className="w-12 px-4 py-2.5 font-medium">#</th>
            <th className="px-4 py-2.5 font-medium">Dự án</th>
            <th className="w-36 px-4 py-2.5 font-medium">Người chủ trì</th>
            <th className="w-28 px-4 py-2.5 font-medium">Deadline</th>
            <th className="w-32 px-4 py-2.5 font-medium">Tiến độ</th>
            <th className="w-24 px-4 py-2.5 text-right font-medium">Tổng</th>
            <th className="w-24 px-4 py-2.5 text-right font-medium">Đã xong</th>
            <th className="w-24 px-4 py-2.5 text-right font-medium">Chưa xong</th>
            <th className="w-24 px-4 py-2.5 text-right font-medium">Quá hạn</th>
            <th className="w-8"/>
          </tr></thead>
          <tbody>
            {!vis.length && <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-400">Không tìm thấy dự án khớp.</td></tr>}
            {vis.map((p, i) => {
              const x = stats(D.tasks, p.id), all = x.tot > 0 && x.dn === x.tot, pOv = projOverdue(p, D.tasks);
              const pct = x.tot === 0 ? 0 : Math.round((x.dn / x.tot) * 100);
              return (
                <tr key={p.id} onClick={() => router.push(`/project/${p.id}`)} className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 ${pOv || x.ov > 0 ? "border-l-4 border-l-rose-500" : all ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-transparent"}`}>
                  <td className="px-4 py-3.5 tabular-nums font-medium text-slate-500">{i + 1}</td>
                  <td className={`px-4 py-3.5 font-medium ${all ? "text-slate-500" : "text-slate-800"}`}>{p.name}</td>
                  <td className="px-4 py-3.5 text-slate-600">{ownerName(D, p.owner)}</td>
                  <td className={`px-4 py-3.5 tabular-nums ${pOv ? "font-semibold text-rose-600" : "text-slate-600"}`}>{fmtD(p.dl) || "—"}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${all ? "bg-emerald-500" : "bg-indigo-500"}`} style={{width:`${pct}%`}}/></div>
                      <span className="w-8 shrink-0 tabular-nums text-xs text-slate-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">{x.tot}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-medium text-emerald-700">{x.dn}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">{x.nd}</td>
                  <td className={`px-4 py-3.5 text-right tabular-nums ${x.ov > 0 ? "font-bold text-rose-600" : "text-slate-300"}`}>{x.ov}</td>
                  <td className="px-4 py-3.5 text-slate-300"><ChevronRight size={16}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
