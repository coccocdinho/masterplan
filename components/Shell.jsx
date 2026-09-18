"use client";
import { useEffect } from "react";
import { AppStateProvider, useApp } from "../lib/AppStateContext";
import { apiPost } from "../lib/apiClient";
import { hasC, urg, scopedTasks } from "../lib/util";
import Side from "./Side";
import NP from "./NP";
import IM from "./IM";
import ChPw from "./ChPw";

function ShellInner({ children }) {
  const { D, me, loading, reload, logout, createProj, importProjs, changePw, showNP, setShowNP, showIM, setShowIM, showCP, setShowCP } = useApp();

  // Pull Google Sheet changes when the app opens and every 15 min while it stays open (server throttles too).
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await apiPost("/api/sync", { action: "pull", auto: true });
        if (!stop && (r.created || r.updated || r.newPending)) reload();
      } catch {}
    };
    tick();
    const id = setInterval(tick, 15 * 60 * 1000);
    return () => { stop = true; clearInterval(id); };
  }, [reload]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Đang tải…</div>;
  }

  const urgCnt = scopedTasks(D, me).filter((t) => hasC(t) && ["over", "today", "soon", "none"].includes(urg(t))).length;

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
