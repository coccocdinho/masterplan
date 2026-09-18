"use client";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { canLog } from "../lib/permissions";
import { RL } from "../lib/constants";
import { fmtDT, LM } from "../lib/util";

export default function Log({ D, myRole }) {
  const [f, sf] = useState("all");
  if (!canLog(myRole)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center"><ShieldAlert className="mx-auto mb-3 text-rose-500" size={36}/><h2 className="text-base font-semibold text-rose-800">Không có quyền</h2></div>
      </div>
    );
  }
  const logs = (D.logs || []).slice().reverse();
  const fd = f === "all" ? logs : logs.filter((l) => l.ac === f);
  const filters = [["all","Tất cả"],["dt","Xoá đầu việc"],["dp","Xoá dự án"],["cp","Tạo dự án"],["au","Thêm tài khoản"],["rp","Reset mật khẩu"],["ip","Import"],["sy","Đồng bộ Sheet"]];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
      <h1 className="text-xl font-bold text-slate-900">Nhật ký hoạt động</h1>
      <p className="mt-0.5 text-sm text-slate-500">Lịch sử tạo, xoá, nhập dữ liệu, quản lý tài khoản.</p>
      <div className="mt-5 flex flex-wrap gap-2">{filters.map(([k,l]) => (
        <button key={k} onClick={() => sf(k)} className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${f===k?"bg-indigo-600 text-white ring-indigo-600":"bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>{l}</button>
      ))}</div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!fd.length ? <div className="px-5 py-12 text-center text-sm text-slate-400">Chưa có hoạt động nào.</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b-2 border-indigo-200 bg-indigo-100/70 text-left text-xs uppercase tracking-wide text-indigo-800">
              <th className="w-44 px-4 py-2.5 font-medium">Thời gian</th><th className="w-40 px-4 py-2.5 font-medium">Hành động</th><th className="w-36 px-4 py-2.5 font-medium">Người thực hiện</th><th className="w-28 px-4 py-2.5 font-medium">Vai trò</th><th className="px-4 py-2.5 font-medium">Đối tượng</th>
            </tr></thead>
            <tbody>{fd.map((l) => {
              const m = LM[l.ac] || { l: l.ac, c: "text-slate-600", b: "bg-slate-100" };
              return (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 align-top">
                  <td className="px-4 py-3 tabular-nums text-slate-600">{fmtDT(l.ts)}</td>
                  <td className="px-4 py-3"><span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${m.b} ${m.c}`}>{m.l}</span></td>
                  <td className="px-4 py-3 text-slate-700">{l.an || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{RL[l.ar] || l.ar}</td>
                  <td className="px-4 py-3"><div className="text-slate-800">{l.tn || "—"}</div>{l.dt && <div className="mt-0.5 text-xs text-slate-500">{l.dt}</div>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
