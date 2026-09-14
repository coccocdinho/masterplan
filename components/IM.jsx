"use client";
import { useState } from "react";
import { X, Upload, CheckSquare, Square } from "lucide-react";
import * as XLSX from "xlsx";
import { extractWb } from "../lib/parseSheet";

export default function IM({ existing, onImp, onClose }) {
  const [fn, sfn] = useState(""), [det, sd] = useState(null), [sel, ssl] = useState({}), [er, se] = useState(""), [busy, sb] = useState(false);

  function hf(e) {
    const f = e.target.files[0];
    if (!f) return;
    sfn(f.name); se(""); sb(true);
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const ps = extractWb(wb, XLSX);
        if (!ps.length) { se("Không tìm thấy sheet dự án."); sd(null); }
        else {
          sd(ps);
          const s = {};
          ps.forEach((p) => { s[p.name] = !existing.includes(p.name); });
          ssl(s);
        }
      } catch { se("Không đọc được file."); }
      sb(false);
    };
    r.readAsArrayBuffer(f);
  }
  const any = det && det.some((p) => sel[p.name]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Nhập từ file Excel</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18}/></button></div>
        <div className="space-y-4 px-5 py-5">
          <p className="text-sm text-slate-500">Tải lên file <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.xlsx</code> — hệ thống tự nhận diện sheet dự án.</p>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600"><Upload size={16}/>{fn || "Chọn file .xlsx"}<input type="file" accept=".xlsx,.xls" onChange={hf} className="hidden"/></label>
          {busy && <p className="text-xs text-slate-400">Đang đọc file…</p>}
          {er && <p className="text-xs text-rose-600">{er}</p>}
          {det && (
            <div className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-400">Tìm thấy {det.length} sheet dự án</div>
              <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                {det.map((p) => (
                  <button key={p.name} onClick={() => ssl((s) => ({ ...s, [p.name]: !s[p.name] }))} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                    {sel[p.name] ? <CheckSquare size={17} className="shrink-0 text-indigo-600"/> : <Square size={17} className="shrink-0 text-slate-300"/>}
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.count} đầu việc {existing.includes(p.name) && <span className="text-amber-600">· trùng tên</span>}</div></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Huỷ</button>
          <button onClick={() => onImp(det.filter((p) => sel[p.name]))} disabled={!any} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40">Nhập {any ? `(${Object.values(sel).filter(Boolean).length})` : ""}</button>
        </div>
      </div>
    </div>
  );
}
