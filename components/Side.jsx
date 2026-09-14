"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus, FileSpreadsheet, LayoutDashboard, AlarmClock, UserCheck, Users,
  ScrollText, FolderKanban, KeyRound, LogOut,
} from "lucide-react";
import { canUsers, canLog } from "../lib/permissions";
import { RL } from "../lib/constants";

export default function Side({ onNew, onImp, urg, me, myRole, onOut, onPw }) {
  const pathname = usePathname();
  const NAV = [
    { k: "overview", href: "/overview", lb: "Tổng quan", I: LayoutDashboard },
    { k: "urgent", href: "/urgent", lb: "Cần đôn đốc hôm nay", I: AlarmClock, badge: urg },
    { k: "staff", href: "/staff", lb: "Theo nhân sự", I: UserCheck },
    ...(canUsers(myRole) ? [{ k: "users", href: "/users", lb: "Quản lý tài khoản", I: Users }] : []),
    ...(canLog(myRole) ? [{ k: "log", href: "/log", lb: "Nhật ký hoạt động", I: ScrollText }] : []),
  ];
  const rc = { user: "text-slate-300", admin: "text-blue-300", super: "text-amber-300" }[myRole] || "text-slate-300";

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-indigo-950 text-indigo-100 lg:w-64">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600"><FolderKanban size={18} className="text-white" strokeWidth={2.3}/></div>
        <div><div className="text-sm font-bold leading-tight text-white">Master Plan</div><div className="mt-0.5 text-[11px] leading-tight text-indigo-300">Ban Phát triển kinh doanh</div></div>
      </div>
      <div className="space-y-2 px-3">
        <button onClick={onNew} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-indigo-900 shadow-sm hover:bg-indigo-50"><Plus size={16} strokeWidth={2.5}/> Tạo dự án mới</button>
        <button onClick={onImp} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-400/40 bg-indigo-900/40 px-3 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-800"><FileSpreadsheet size={15}/> Nhập từ Excel</button>
      </div>
      <nav className="mt-6 flex-1 space-y-1 px-3">
        {NAV.map(item => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const I = item.I;
          return (
            <Link key={item.k} href={item.href} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-indigo-800/70 text-white" : "text-indigo-200 hover:bg-indigo-900 hover:text-white"}`}>
              <span className="flex min-w-0 items-center gap-2.5"><I size={17} className="shrink-0"/><span className="truncate">{item.lb}</span></span>
              {!!item.badge && <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-indigo-900 px-3 py-3 space-y-1">
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-800 text-xs font-bold text-white">{me.username.slice(0,2).toUpperCase()}</div>
          <div className="min-w-0"><div className="truncate text-sm font-medium text-white">{me.username}</div><div className={`text-[11px] ${rc}`}>{RL[myRole]}</div></div>
        </div>
        <button onClick={onPw} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-200 hover:bg-indigo-900 hover:text-white"><KeyRound size={15}/> Đổi mật khẩu</button>
        <button onClick={onOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-200 hover:bg-rose-900/40 hover:text-rose-300"><LogOut size={15}/> Đăng xuất</button>
      </div>
    </aside>
  );
}
