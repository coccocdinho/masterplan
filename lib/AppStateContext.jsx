"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPatch, apiDelete } from "./apiClient";
import { RL } from "./constants";

const Ctx = createContext(null);

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppStateProvider>");
  return ctx;
}

export function AppStateProvider({ me, children }) {
  const router = useRouter();
  const [D, setD] = useState({ users: [], projects: [], tasks: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showNP, setShowNP] = useState(false);
  const [showIM, setShowIM] = useState(false);
  const [showCP, setShowCP] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await apiGet("/api/state");
      setD(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Mirrors the log row the server just wrote, so the Log page doesn't look
  // stale until the next full reload() (server is still the source of truth).
  function pushLog(ac, tn = "", dt = "") {
    setD((d) => ({
      ...d,
      logs: [...d.logs, { id: `local-${Date.now()}`, ts: Date.now(), ac, an: me.username, ar: me.role, tn, dt }],
    }));
  }

  async function logout() {
    try { await apiPost("/api/auth/logout"); } catch {}
    router.push("/login");
    router.refresh();
  }

  // ---- Users ----
  async function addUser({ username, role, pw }) {
    const u = await apiPost("/api/users", { username, role, pw });
    setD((d) => ({ ...d, users: [...d.users, u] }));
    pushLog("au", username, `Vai trò: ${RL[role]}`);
  }
  async function resetPw(uid, newPw) {
    const target = D.users.find((u) => u.id === uid);
    await apiPost(`/api/users/${uid}/reset-pw`, { newPw });
    pushLog("rp", target?.username || "");
  }
  async function delUser(uid) {
    const target = D.users.find((u) => u.id === uid);
    setD((d) => ({ ...d, users: d.users.filter((u) => u.id !== uid) }));
    try {
      await apiDelete(`/api/users/${uid}`);
      pushLog("du", target?.username || "");
    } catch (e) {
      reload();
      throw e;
    }
  }
  async function changePw({ oldPw, newPw }) {
    try {
      await apiPost("/api/users/me/change-pw", { oldPw, newPw });
      setShowCP(false);
      return {};
    } catch (e) {
      return { error: e.message };
    }
  }

  // ---- Projects ----
  async function createProj({ name, owner, dl, csv }) {
    const p = await apiPost("/api/projects", { name, owner, dl, csv });
    setD((d) => ({ ...d, projects: [...d.projects, p] }));
    pushLog("cp", name, csv?.length ? `${csv.length} đầu việc` : "");
    if (csv?.length) reload(); // pick up the imported tasks in one shot
    setShowNP(false);
    router.push(`/project/${p.id}`);
    return p;
  }
  async function importProjs(picked) {
    await apiPost("/api/import", { picked });
    setShowIM(false);
    await reload();
  }
  async function setProjOwner(projId, ownerId) {
    setD((d) => ({ ...d, projects: d.projects.map((p) => (p.id === projId ? { ...p, owner: ownerId } : p)) }));
    try {
      await apiPatch(`/api/projects/${projId}`, { owner: ownerId });
    } catch (e) {
      reload();
      throw e;
    }
  }
  async function setProjDeadline(projId, dl) {
    setD((d) => ({ ...d, projects: d.projects.map((p) => (p.id === projId ? { ...p, dl } : p)) }));
    try {
      await apiPatch(`/api/projects/${projId}`, { dl });
    } catch (e) {
      reload();
      throw e;
    }
  }
  async function delProj(projId) {
    const proj = D.projects.find((p) => p.id === projId);
    const taskCount = D.tasks.filter((t) => t.pid === projId).length;
    setD((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== projId), tasks: d.tasks.filter((t) => t.pid !== projId) }));
    try {
      await apiDelete(`/api/projects/${projId}`);
      pushLog("dp", proj?.name || "", taskCount ? `Kèm ${taskCount} đầu việc` : "");
    } catch (e) {
      reload();
      throw e;
    }
    router.push("/overview");
  }

  // ---- Tasks ----
  async function addTask(projId) {
    const t = await apiPost("/api/tasks", { projectId: projId });
    setD((d) => ({ ...d, tasks: [...d.tasks, t] }));
  }
  async function updTask(tid, patch) {
    setD((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === tid ? { ...t, ...patch } : t)) }));
    try {
      await apiPatch(`/api/tasks/${tid}`, patch);
    } catch (e) {
      reload();
      throw e;
    }
  }
  async function delTask(tid) {
    const t = D.tasks.find((x) => x.id === tid);
    const proj = t ? D.projects.find((p) => p.id === t.pid) : null;
    const nm = t?.dv || (t?.subtasks || []).find((s) => s.text)?.text || "(chưa có tên)";
    setD((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== tid) }));
    try {
      await apiDelete(`/api/tasks/${tid}`);
      pushLog("dt", nm, proj ? `Trong dự án: ${proj.name}` : "");
    } catch (e) {
      reload();
      throw e;
    }
  }

  // ---- Subtasks ----
  async function addSubtask(tid) {
    const s = await apiPost(`/api/tasks/${tid}/subtasks`);
    setD((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === tid ? { ...t, subtasks: [...(t.subtasks || []), s] } : t)) }));
  }
  async function updSubtask(tid, subId, patch) {
    setD((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === tid ? { ...t, subtasks: (t.subtasks || []).map((s) => (s.id === subId ? { ...s, ...patch } : s)) } : t
      ),
    }));
    try {
      await apiPatch(`/api/tasks/${tid}/subtasks/${subId}`, patch);
    } catch (e) {
      reload();
      throw e;
    }
  }
  async function delSubtask(tid, subId) {
    setD((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === tid ? { ...t, subtasks: (t.subtasks || []).filter((s) => s.id !== subId) } : t)),
    }));
    try {
      await apiDelete(`/api/tasks/${tid}/subtasks/${subId}`);
    } catch (e) {
      reload();
      throw e;
    }
  }

  const value = {
    D, me, loading, err, reload, logout,
    addUser, resetPw, delUser, changePw,
    createProj, importProjs, setProjOwner, setProjDeadline, delProj,
    addTask, updTask, delTask,
    addSubtask, updSubtask, delSubtask,
    showNP, setShowNP, showIM, setShowIM, showCP, setShowCP,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
