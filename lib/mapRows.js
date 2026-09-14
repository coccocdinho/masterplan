// DB row <-> client JSON shape. The client keeps the exact field names the
// original localStorage blob used (task.pid, project.owner, log.ac, ...) so the
// ported components/pure functions in lib/util.js don't need to change.

export function mapUser(row) {
  return { id: row.id, username: row.username, role: row.role, at: row.created_at, by: row.created_by };
}

export function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner_id || "",
    dl: row.dl || "",
    at: row.created_at,
    by: row.created_by,
    sheet_tab_name: row.sheet_tab_name || null,
  };
}

export function mapSubtask(row) {
  return { id: row.id, text: row.text || "", dl: row.dl || "", acc: row.acc || "", st: row.st, gc: row.gc || "" };
}

export function mapTask(row, subtaskRows = []) {
  return {
    id: row.id,
    pid: row.project_id,
    by: row.created_by,
    hm: row.hm || "",
    dv: row.dv || "",
    dl: row.dl || "",
    acc: row.acc || "",
    st: row.st,
    gc: row.gc || "",
    subtasks: subtaskRows
      .filter((s) => s.task_id === row.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(mapSubtask),
  };
}

export function mapLog(row) {
  return {
    id: row.id,
    ts: new Date(row.ts).getTime(),
    ac: row.action_code,
    an: row.actor_name,
    ar: row.actor_role,
    tn: row.target_name,
    dt: row.detail,
  };
}
