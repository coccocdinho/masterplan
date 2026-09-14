"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Eye, EyeOff } from "lucide-react";
import { apiPost } from "../lib/apiClient";

export default function Login() {
  const router = useRouter();
  const [u, su] = useState(""), [p, sp] = useState(""), [show, ss] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e) {
    e.preventDefault();
    if (!u.trim() || !p) return;
    setBusy(true); setErr("");
    try {
      await apiPost("/api/auth/login", { username: u.trim(), password: p });
      router.push("/overview");
      router.refresh();
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg"><FolderKanban size={28} className="text-white" strokeWidth={2.2}/></div>
          <h1 className="text-2xl font-bold text-white">Master Plan</h1>
          <p className="mt-1 text-sm text-indigo-300">Ban Phát triển kinh doanh — BES</p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-lg font-semibold text-slate-800">Đăng nhập</h2>
          <form onSubmit={go} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tên đăng nhập</label>
              <input value={u} onChange={e=>su(e.target.value)} placeholder="VD: QuanLH" autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"/>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Mật khẩu</label>
              <div className="relative">
                <input type={show?"text":"password"} value={p} onChange={e=>sp(e.target.value)} placeholder="••••••"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"/>
                <button type="button" onClick={()=>ss(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </div>
            {err&&<div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
            <button type="submit" disabled={!u.trim()||!p||busy}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-400">Liên hệ Super Admin để được cấp tài khoản</p>
        </div>
      </div>
    </div>
  );
}
