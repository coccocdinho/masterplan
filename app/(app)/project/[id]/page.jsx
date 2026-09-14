"use client";
import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useApp } from "../../../../lib/AppStateContext";
import { canDelTask } from "../../../../lib/permissions";
import Detail from "../../../../components/Detail";
import Dlg from "../../../../components/Dlg";

export default function ProjectPage() {
  return (
    <Suspense fallback={null}>
      <ProjectPageInner/>
    </Suspense>
  );
}

function ProjectPageInner() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const hlId = searchParams.get("hl");
  const { D, me, delTask, delProj, updTask, addTask, addSubtask, updSubtask, delSubtask, setProjOwner, setProjDeadline } = useApp();
  const [dlg, setDlg] = useState(null);

  const proj = D.projects.find((p) => p.id === id);
  const tasks = D.tasks.filter((t) => t.pid === id);

  if (!proj) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-400">Không tìm thấy dự án (có thể đã bị xoá).</div>;
  }

  function reqDelTask(tid) {
    const t = D.tasks.find((x) => x.id === tid);
    if (!t || !canDelTask({ by: t.by }, me.role, me.id)) return;
    const p = D.projects.find((x) => x.id === t.pid);
    const nm = t.dv || (t.subtasks || []).find((s) => s.text)?.text || "(chưa có tên)";
    setDlg({
      title: "Xoá đầu việc?",
      msg: `Xoá đầu việc "${nm}"${p ? ` trong dự án "${p.name}"` : ""}? Không thể hoàn tác.`,
      okLabel: "Xoá đầu việc",
      onOk: () => { delTask(tid); setDlg(null); },
    });
  }

  function reqDelProj(projId) {
    const p = D.projects.find((x) => x.id === projId);
    if (!p) return;
    const tc = D.tasks.filter((t) => t.pid === projId).length;
    setDlg({
      title: "Xoá dự án?",
      msg: `Xoá dự án "${p.name}"${tc > 0 ? ` và ${tc} đầu việc` : ""}? Không thể hoàn tác.`,
      okLabel: "Xoá dự án",
      onOk: () => { delProj(projId); setDlg(null); },
    });
  }

  return (
    <>
      <Detail
        proj={proj} tasks={tasks} users={D.users} myRole={me.role} myId={me.id} hlId={hlId}
        onAdd={addTask} onUpd={updTask} onAddSub={addSubtask} onUpdSub={updSubtask} onDelSub={delSubtask}
        onDelT={reqDelTask} onDelP={reqDelProj} onSetOwner={setProjOwner} onSetDeadline={setProjDeadline}
      />
      <Dlg open={!!dlg} title={dlg?.title} msg={dlg?.msg} okLabel={dlg?.okLabel} onOk={dlg?.onOk} onNo={() => setDlg(null)}/>
    </>
  );
}
