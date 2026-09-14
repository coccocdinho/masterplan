"use client";
import { useState } from "react";
import { KeyRound, X, Eye, EyeOff } from "lucide-react";

export default function ChPw({ title = "Đổi mật khẩu", needOld = true, onSave, onClose }) {
  const [op, sop] = useState(""), [np, snp] = useState(""), [cf, scf] = useState(""), [er, se] = useState(""), [sh, ssh] = useState(false);
  async function go() {
    se("");
    if (np.length < 6) { se("Mật khẩu mới ≥ 6 ký tự."); return; }
    if (np !== cf) { se("Xác nhận không khớp."); return; }
    const r = await onSave({ oldPw: op, newPw: np });
    if (r?.error) se(r.error);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="flex items-center gap-2 text-base font-semibold text-slate-900"><KeyRound size={16} className="text-indigo-600"/>{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18}/></button></div>
        <div className="space-y-3 px-5 py-5">
          {needOld && <div><label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu hiện tại</label><input type="password" value={op} onChange={e=>sop(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"/></div>}
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu mới (≥ 6 ký tự)</label><div className="relative"><input type={sh?"text":"password"} value={np} onChange={e=>snp(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-9 text-sm focus:border-indigo-400 focus:outline-none"/><button type="button" onClick={()=>ssh(v=>!v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">{sh?<EyeOff size={14}/>:<Eye size={14}/>}</button></div></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Xác nhận mật khẩu mới</label><input type="password" value={cf} onChange={e=>scf(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"/></div>
          {er && <p className="text-xs text-rose-600">{er}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Huỷ</button><button onClick={go} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Lưu</button></div>
      </div>
    </div>
  );
}
