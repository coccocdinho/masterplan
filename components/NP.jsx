"use client";
import { useState } from "react";
import { X, Upload } from "lucide-react";
import Papa from "papaparse";
import { canAssignOwner } from "../lib/permissions";
import { parseDate, normSt } from "../lib/parseSheet";

export default function NP({ users, myRole, onCreate, onClose }) {
  const [n, sn] = useState(""), [o, so] = useState(""), [dl, sdl] = useState(""), [fn, sfn] = useState(""), [csv, sc] = useState(null), [er, se] = useState(""), [link, setLink] = useState(true);

  function ff(row, cands) {
    for (const k of Object.keys(row)) {
      const nm = k.trim().toLowerCase();
      if (cands.some((c) => nm === c)) return row[k];
    }
    return "";
  }
  function hf(e) {
    const f = e.target.files[0];
    if (!f) return;
    sfn(f.name); se("");
    const r = new FileReader();
    r.onload = (ev) => Papa.parse(ev.target.result, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        try {
          const rows = res.data.map((r) => ({
            hm: ff(r, ["hạng mục", "hang muc"]), dv: ff(r, ["đầu việc", "dau viec"]), vc: ff(r, ["việc con", "viec con"]),
            dl: parseDate(ff(r, ["deadline", "hạn", "han"])), acc: ff(r, ["acc"]), st: normSt(ff(r, ["trạng thái", "trang thai"])), gc: ff(r, ["ghi chú", "ghi chu", "note"]),
          })).filter((r) => (r.dv || "").trim() || (r.vc || "").trim());
          sc(rows);
        } catch { se("Không đọc được file."); }
      },
      error: () => se("Không đọc được file."),
    });
    r.readAsText(f, "UTF-8");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Tạo dự án mới</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18}/></button></div>
        <div className="space-y-4 px-5 py-5">
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Tên dự án</label><input value={n} onChange={e=>sn(e.target.value)} placeholder="VD: Xin cấp phép kết nối RSHUB" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"/></div>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-sm text-slate-700">
            <input type="checkbox" checked={link} onChange={e=>setLink(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"/>
            <span className="font-medium">Đồng bộ dự án này với Google Sheet <span className="block text-xs font-normal text-slate-500">Tạo tab tương ứng để người không dùng app vẫn theo dõi và cập nhật được. Sửa ở đâu cũng tự đồng bộ.</span></span>
          </label>
          <div className="flex gap-3">
            {canAssignOwner(myRole) && (
              <div className="flex-1"><label className="mb-1 block text-sm font-medium text-slate-700">Người chủ trì</label>
                <select value={o} onChange={e=>so(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400">
                  <option value="">Chưa gán</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>
            )}
            <div className="w-40"><label className="mb-1 block text-sm font-medium text-slate-700">Deadline <span className="font-normal text-slate-400">(không bắt buộc)</span></label><input type="date" value={dl} onChange={e=>sdl(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"/></div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nhập đầu việc từ CSV <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600"><Upload size={16}/>{fn || "Chọn file CSV"}<input type="file" accept=".csv" onChange={hf} className="hidden"/></label>
            {er && <p className="mt-1.5 text-xs text-rose-600">{er}</p>}
            {csv && !er && <p className="mt-1.5 text-xs text-emerald-700">Đã đọc {csv.length} đầu việc.</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Huỷ</button>
          <button onClick={() => { if (n.trim()) onCreate({ name: n.trim(), owner: o, dl, csv: csv || [], linkSheet: link }); }} disabled={!n.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40">Tạo dự án</button>
        </div>
      </div>
    </div>
  );
}
