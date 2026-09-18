"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Upload, Check, X, ShieldAlert, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { canSync } from "../lib/permissions";
import { apiGet, apiPost } from "../lib/apiClient";
import { fmtDT } from "../lib/util";

export default function SheetSync({ myRole, projects = [], onChanged }) {
  const [pick, setPick] = useState({});
  const free = projects.filter((p) => !p.sheet_tab_name);
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try { setInfo(await apiGet("/api/sync")); setErr(""); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { if (canSync(myRole)) load(); }, [load, myRole]);

  async function run(key, body, okMsg) {
    setBusy(key); setMsg(""); setErr("");
    try {
      const r = await apiPost("/api/sync", body);
      setMsg(okMsg(r));
      await load();
      onChanged?.();
    } catch (e) { setErr(e.message); }
    setBusy("");
  }

  if (!canSync(myRole)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center"><ShieldAlert className="mx-auto mb-3 text-rose-500" size={36}/><h2 className="text-base font-semibold text-rose-800">Không có quyền</h2></div>
      </div>
    );
  }

  const last = info?.last;
  const pullMsg = (r) => `Đã đồng bộ. Sheet → App: ${r.created} mới, ${r.updated} cập nhật. App → Sheet: ${r.pushed} dòng${r.conflicts?.length ? `. ${r.conflicts.length} dòng sửa cả hai phía (đã lấy bản App)` : ""}${r.newPending ? `. ${r.newPending} tab mới chờ duyệt` : ""}.`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Đồng bộ Google Sheet</h1>
          <p className="mt-0.5 text-sm text-slate-500">App là bản chính. Sửa ở đâu cũng tự đồng bộ hai chiều: vài giây sau khi sửa trong app, khi mở app, mỗi 15 phút khi đang mở và mỗi sáng 6h.</p>
        </div>
        <button disabled={!!busy || !info?.configured} onClick={() => run("pull", { action: "pull" }, pullMsg)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40">
          <RefreshCw size={15} className={busy === "pull" ? "animate-spin" : ""}/> Đồng bộ ngay (2 chiều)
        </button>
      </div>

      {info && !info.configured && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Chưa cấu hình Google Sheets (thiếu GOOGLE_SA_KEY_B64 / GOOGLE_SHEET_ID).</div>}
      {err && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>}
      {msg && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>}

      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm text-slate-700">
        <div className="font-semibold text-indigo-900">Cơ chế đồng bộ: App là bản chính</div>
        <p className="mt-1 text-xs text-slate-500">Mỗi dòng nhớ "bản chụp" ở lần đồng bộ trước, rồi so sánh xem bên nào đã sửa kể từ đó:</p>
        <table className="mt-2 w-full text-xs">
          <thead><tr className="text-left text-slate-500"><th className="w-1/3 py-1 pr-3 font-medium">Từ lần đồng bộ trước</th><th className="py-1 font-medium">Kết quả</th></tr></thead>
          <tbody className="divide-y divide-indigo-100">
            <tr><td className="py-1.5 pr-3 font-medium">Chỉ Sheet sửa</td><td className="py-1.5">App cập nhật theo Sheet.</td></tr>
            <tr><td className="py-1.5 pr-3 font-medium">Chỉ App sửa (Sheet chưa sửa)</td><td className="py-1.5">Sheet cập nhật theo App (vài giây sau khi sửa). Đồng bộ từ Sheet không bao giờ ghi đè chỉnh sửa của App.</td></tr>
            <tr><td className="py-1.5 pr-3 font-medium">Cả hai cùng sửa một dòng</td><td className="py-1.5">Lấy bản <b>App</b>, và báo ở mục xung đột bên dưới.</td></tr>
            <tr><td className="py-1.5 pr-3 font-medium">Không ai sửa</td><td className="py-1.5">Không làm gì.</td></tr>
            <tr><td className="py-1.5 pr-3 font-medium">Gõ thêm dòng mới trên Sheet</td><td className="py-1.5">Tạo thêm trong App (đầu việc mới, hoặc việc con của đầu việc phía trên).</td></tr>
            <tr><td className="py-1.5 pr-3 font-medium">Xoá trong App</td><td className="py-1.5">Dòng biến mất khỏi Sheet.</td></tr>
            <tr><td className="py-1.5 pr-3 font-medium">Xoá dòng trên Sheet</td><td className="py-1.5">Không xoá trong App — dòng được ghi lại. Muốn xoá thì xoá trong App.</td></tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Lần đồng bộ gần nhất: <span className="font-medium text-slate-800">{last?.at ? fmtDT(last.at) : "chưa có"}</span>
        {last && <span className="ml-2 text-slate-400">(Sheet → App: {last.created} mới, {last.updated} cập nhật · App → Sheet: {last.pushed ?? 0} dòng)</span>}
        {!!last?.errors?.length && <ul className="mt-2 space-y-1 text-xs text-rose-600">{last.errors.map((e, i) => <li key={i}>• {e}</li>)}</ul>}
        {!!last?.conflicts?.length && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <div className="mb-1 flex items-center gap-1 font-semibold"><AlertTriangle size={13}/> {last.conflicts.length} dòng bị sửa ở cả App và Sheet trong lần đồng bộ gần nhất — đã lấy bản App:</div>
            <ul className="space-y-0.5">{last.conflicts.slice(0, 10).map((c, i) => <li key={i}>• [{c.tab}] dòng {c.row}: {c.name}</li>)}</ul>
            <div className="mt-1">Bản Sheet bị thay vẫn xem lại được trong Tệp → Lịch sử phiên bản của Google Sheet.</div>
          </div>
        )}
        {!!last?.orphans?.length && <div className="mt-2 text-xs text-slate-500">{last.orphans.length} dòng có mã _id không còn trong App (đã xoá bên App?) — bị bỏ qua.</div>}
        {!!last?.missing?.length && <div className="mt-2 text-xs text-rose-600">Không thấy tab của dự án: {last.missing.join(", ")} (bị đổi tên hoặc xoá trên Sheet?)</div>}
      </div>

      <h2 className="mt-7 text-base font-semibold text-slate-900">Tab mới trên Sheet, chờ duyệt ({info?.pending?.length || 0})</h2>
      <p className="mt-0.5 text-sm text-slate-500">Tab chưa liên kết với dự án nào trong App. <b className="font-semibold text-slate-700">Nếu dự án đã có sẵn trong App, hãy liên kết — App là bản chính, nội dung cũ của tab sẽ bị thay bằng dữ liệu từ App.</b> Chỉ chọn "Tạo dự án mới" cho tab hoàn toàn mới.</p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!info?.pending?.length ? <div className="px-5 py-8 text-center text-sm text-slate-400">Không có tab nào chờ duyệt.</div> : (
          <ul className="divide-y divide-slate-100">
            {info.pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium text-slate-800"><FileSpreadsheet size={15} className="text-emerald-600"/>{p.source_tab_name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{p.source_row_snapshot?.rowCount ?? 0} đầu việc{p.source_row_snapshot?.sample?.length ? ` · VD: ${p.source_row_snapshot.sample.slice(0, 2).join("; ")}` : ""}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={pick[p.id] || ""} onChange={e=>setPick({ ...pick, [p.id]: e.target.value })} className="max-w-[200px] rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none">
                    <option value="">Chọn dự án có sẵn…</option>
                    {free.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                  </select>
                  <button disabled={!!busy || !pick[p.id]} onClick={() => { if (window.confirm(`Liên kết tab "${p.source_tab_name}" với dự án đã chọn?\n\nApp là bản chính: toàn bộ đầu việc hiện có trong tab sẽ bị thay bằng dữ liệu từ App. (Lịch sử phiên bản Google Sheet vẫn khôi phục được.)`)) run(`l${p.id}`, { action: "link", projectId: pick[p.id], tab: p.source_tab_name, pendingId: p.id }, (r) => `Đã liên kết và ghi ${r.pushed} dòng từ App lên tab "${r.tab}".`); }} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"><Upload size={14}/> Liên kết (App là bản chính)</button>
                  <button disabled={!!busy} onClick={() => { if (window.confirm(`Tạo dự án MỚI từ tab "${p.source_tab_name}" và nhập đầu việc từ Sheet vào App?\n\nChỉ dùng cho tab chưa có trong App.`)) run(`a${p.id}`, { action: "approve", pendingId: p.id }, (r) => `Đã tạo dự án "${r.project.name}" với ${r.created} đầu việc.`); }} className="flex items-center gap-1 rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"><Check size={14}/> Tạo dự án mới</button>
                  <button disabled={!!busy} onClick={() => run(`r${p.id}`, { action: "reject", pendingId: p.id }, () => "Đã bỏ qua tab.")} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={14}/> Bỏ qua</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="mt-7 text-base font-semibold text-slate-900">Dự án đã liên kết ({info?.linked?.length || 0})</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!info?.linked?.length ? <div className="px-5 py-8 text-center text-sm text-slate-400">Chưa có dự án nào liên kết với Sheet.</div> : (
          <ul className="divide-y divide-slate-100">
            {info.linked.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="font-medium text-slate-800">{p.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">Tab: {p.sheet_tab_name}</div>
                </div>
                <button disabled={!!busy} onClick={() => run(`p${p.id}`, { action: "push", projectId: p.id }, (r) => `Đã đồng bộ tab "${r.tab}": Sheet → App ${r.created + r.updated} thay đổi, App → Sheet ${r.pushed} dòng${r.conflicts.length ? `, ${r.conflicts.length} dòng sửa cả hai phía đã lấy bản App` : ""}.`)} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"><RefreshCw size={14}/> Đồng bộ dự án này</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
