"use client";
import { AlertTriangle } from "lucide-react";

export default function Dlg({ open, title, msg, okLabel = "Xoá", onOk, onNo }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-start gap-4 px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100"><AlertTriangle size={20} className="text-rose-600" strokeWidth={2.3}/></div>
          <div className="flex-1 pt-0.5"><h3 className="text-base font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-600">{msg}</p></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button onClick={onNo} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Huỷ</button>
          <button onClick={onOk} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500">{okLabel}</button>
        </div>
      </div>
    </div>
  );
}
