"use client";
import { useState } from "react";
import { UserPlus, RefreshCw, Trash2, X } from "lucide-react";
import { canCreate, canResetPw } from "../lib/permissions";
import { R, RL } from "../lib/constants";
import ChPw from "./ChPw";
import Dlg from "./Dlg";

export default function UserPage({ D, me, myRole, onAdd, onReset, onDel }) {
  const [showAdd, sa] = useState(false), [au, sAU] = useState(""), [ar, sAR] = useState(R.U), [ap, sAP] = useState(""), [ae, sAE] = useState("");
  const [rst, sRst] = useState(null), [del, sDel] = useState(null);
  const cRoles = Object.values(R).filter((r) => canCreate(myRole, r));
  const vis = D.users.filter((u) => u.id === me.id || myRole === R.S || (myRole === R.A && u.role === R.U));

  async function doAdd() {
    sAE("");
    if (!au.trim()) { sAE("Nhập tên đăng nhập."); return; }
    if (ap.length < 6) { sAE("Mật khẩu ≥ 6 ký tự."); return; }
    if (D.users.find((u) => u.username === au.trim())) { sAE("Tên đã tồn tại."); return; }
    try {
      await onAdd({ username: au.trim(), role: ar, pw: ap });
      sa(false); sAU(""); sAP(""); sAE("");
    } catch (e) { sAE(e.message); }
  }

  const rb = (r) => ({ user: "bg-slate-100 text-slate-600", admin: "bg-blue-50 text-blue-700", super: "bg-indigo-50 text-indigo-700" }[r] || "bg-slate-100 text-slate-600");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold text-slate-900">Quản lý tài khoản</h1><p className="mt-0.5 text-sm text-slate-500">{myRole === R.S ? "Super Admin có thể tạo Admin và User." : "Admin có thể tạo User."}</p></div>
        {cRoles.length > 0 && <button onClick={() => sa(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"><UserPlus size={16}/> Thêm tài khoản</button>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b-2 border-indigo-200 bg-indigo-50/70 text-left text-xs uppercase tracking-wide text-indigo-900">
            <th className="w-10 px-4 py-2.5 font-medium">#</th><th className="px-4 py-2.5 font-medium">Tên đăng nhập</th><th className="w-28 px-4 py-2.5 font-medium">Vai trò</th><th className="w-36 px-4 py-2.5 font-medium">Ngày tạo</th><th className="w-32 px-4 py-2.5 font-medium">Tạo bởi</th><th className="w-36 px-4 py-2.5 font-medium">Thao tác</th>
          </tr></thead>
          <tbody>{vis.map((u, i) => {
            const isSelf = u.id === me.id, canR = !isSelf && canResetPw(myRole, u.role), canD = !isSelf && canCreate(myRole, u.role);
            return (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2 font-medium text-slate-800">{u.username}{isSelf && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">Bạn</span>}</div></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rb(u.role)}`}>{RL[u.role]}</span></td>
                <td className="px-4 py-3 text-slate-500">{u.at || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{u.by || "—"}</td>
                <td className="px-4 py-3"><div className="flex gap-1">
                  {canR && <button onClick={() => sRst(u)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"><RefreshCw size={11}/> Reset</button>}
                  {canD && <button onClick={() => sDel(u)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"><Trash2 size={11}/> Xoá</button>}
                </div></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="flex items-center gap-2 text-base font-semibold text-slate-900"><UserPlus size={16} className="text-indigo-600"/>Thêm tài khoản mới</h3><button onClick={() => sa(false)} className="text-slate-400 hover:text-slate-700"><X size={18}/></button></div>
            <div className="space-y-4 px-5 py-5">
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Tên đăng nhập</label><input value={au} onChange={e=>sAU(e.target.value)} placeholder="VD: NguyenVA" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"/></div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Vai trò</label><select value={ar} onChange={e=>sAR(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">{cRoles.map(r=><option key={r} value={r}>{RL[r]}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu tạm (≥ 6 ký tự)</label><input type="text" value={ap} onChange={e=>sAP(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"/></div>
              {ae && <p className="text-xs text-rose-600">{ae}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button onClick={() => sa(false)} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Huỷ</button><button onClick={doAdd} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Tạo tài khoản</button></div>
          </div>
        </div>
      )}
      {rst && <ChPw title={`Reset mật khẩu — ${rst.username}`} needOld={false} onSave={async ({ newPw }) => { await onReset(rst.id, newPw); sRst(null); return {}; }} onClose={() => sRst(null)}/>}
      <Dlg open={!!del} title="Xoá tài khoản?" msg={`Xoá tài khoản "${del?.username}"? Không thể hoàn tác.`} okLabel="Xoá tài khoản" onOk={() => { onDel(del.id); sDel(null); }} onNo={() => sDel(null)}/>
    </div>
  );
}
