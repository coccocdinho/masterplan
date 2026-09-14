"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPatch, apiDelete } from "./apiClient";

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

  async function logout() {
    try { await apiPost("/api/auth/logout"); } catch {}
    router.push("/login");
    router.refresh();
  }

  // ---- Users ----
  async function addUser({ username, role, pw }) {
    const u = await apiPost("/api/users", { username, role, pw });
    setD((d) => ({ ...d, users: [...d.users, u] }));
  }
  async function resetPw(uid, newPw) {
    await apiPost(`/api/users/${uid}/reset-pw`, { newPw });
  }
  async function delUser(uid) {
    setD((d) => ({ ...d, users: d.users.filter((u) => u.id !== uid) }));
    try {
      await apiDelete(`/api/users/${uid}`);
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
    setD((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== projId), tasks: d.tasks.filter((t) => t.pid !== projId) }));
    try {
      await apiDelete(`/api/projects/${projId}`);
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
    setD((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== tid) }));
    try {
      await apiDelete(`/api/tasks/${tid}`);
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
