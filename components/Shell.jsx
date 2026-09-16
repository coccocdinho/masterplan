"use client";
import { AppStateProvider, useApp } from "../lib/AppStateContext";
import { hasC, urg } from "../lib/util";
import Side from "./Side";
import NP from "./NP";
import IM from "./IM";
import ChPw from "./ChPw";

function ShellInner({ children }) {
  const { D, me, loading, logout, createProj, importProjs, changePw, showNP, setShowNP, showIM, setShowIM, showCP, setShowCP } = useApp();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Đang tải…</div>;
  }

  const urgCnt = D.tasks.filter((t) => hasC(t) && ["over", "today", "soon", "none"].includes(urg(t))).length;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <Side onNew={() => setShowNP(true)} onImp={() => setShowIM(true)} urg={urgCnt} me={me} myRole={me.role} onOut={logout} onPw={() => setShowCP(true)}/>
      <div className="min-w-0 flex-1">{children}</div>
      {showNP && <NP users={D.users} myRole={me.role} onCreate={createProj} onClose={() => setShowNP(false)}/>}
      {showIM && <IM existing={D.projects.map((p) => p.name)} onImp={importProjs} onClose={() => setShowIM(false)}/>}
      {showCP && <ChPw onSave={changePw} onClose={() => setShowCP(false)}/>}
    </div>
  );
}

export default function Shell({ me, children }) {
  return (
    <AppStateProvider me={me}>
      <ShellInner>{children}</ShellInner>
    </AppStateProvider>
  );
}
