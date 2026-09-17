"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { globalStaffStats } from "../lib/util";
import StaffDetail from "./StaffDetail";

export default function StaffOverview({ D }) {
  const rows = globalStaffStats(D);
  const [sel, setSel] = useState(null);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <h1 className="text-xl font-bold text-slate-900">Theo nhân sự</h1>
      <p className="mt-0.5 text-sm text-slate-500">Khối lượng công việc của từng người trên toàn bộ dự án. Bấm vào một người để xem chi tiết từng việc.</p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!rows.length ? <div className="px-5 py-12 text-center text-sm text-slate-400">Chưa có đầu việc nào để thống kê.</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b-2 border-indigo-200 bg-indigo-100/70 text-left text-xs uppercase tracking-wide text-indigo-800">
              <th className="w-12 px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Nhân sự (Acc)</th>
              <th className="w-28 px-4 py-2.5 text-right font-medium">Số dự án</th>
              <th className="w-28 px-4 py-2.5 text-right font-medium">Tổng việc</th>
              <th className="w-28 px-4 py-2.5 text-right font-medium">Đã xong</th>
              <th className="w-28 px-4 py-2.5 text-right font-medium">Chưa xong</th>
              <th className="w-28 px-4 py-2.5 text-right font-medium">Quá hạn</th>
              <th className="w-8"/>
            </tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.name} onClick={() => setSel((s) => (s === r.name ? null : r.name))} className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 ${sel === r.name ? "bg-indigo-50/70" : ""}`}>
                <td className="px-4 py-3 tabular-nums font-medium text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{r.projCount}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{r.tot}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-700">{r.dn}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{r.nd}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${r.ov > 0 ? "font-bold text-rose-600" : "text-slate-300"}`}>{r.ov}</td>
                <td className="px-4 py-3 text-slate-300"><ChevronRight size={16} className={`transition-transform ${sel === r.name ? "rotate-90" : ""}`}/></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {sel && <StaffDetail D={D} name={sel} onClose={() => setSel(null)}/>}
    </div>
  );
}
