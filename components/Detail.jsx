"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, X, Plus, AlertTriangle, Clock, CalendarClock, Filter, Upload, FileSpreadsheet, Users, ChevronUp, ChevronDown } from "lucide-react";
import { stats, urg, hasC, TASK_SORTERS } from "../lib/util";
import { canDelProj, canDelTask, canAssignOwner } from "../lib/permissions";
import { STO } from "../lib/constants";
import Th from "./Th";
import TaskRow from "./TaskRow";
import DateInput from "./DateInput";
import StaffChart from "./StaffChart";

export default function Detail({ proj, tasks, users, myRole, myId, onDelT, onAdd, onUpd, onAddSub, onUpdSub, onDelSub, onDelP, onSetOwner, onSetDeadline, onSetName, onPushSheet, hlId }) {
  const router = useRouter();
  const rr = useRef({});
  const [fl, sfl] = useState(null);
  const [hmF, setHmF] = useState(""), [accF, setAccF] = useState(""), [stF, setStF] = useState(""), [dlFrom, setDlFrom] = useState(""), [dlTo, setDlTo] = useState("");
  const [sortKey, setSortKey] = useState("urg"), [sortDir, setSortDir] = useState("asc");
  const [nameDraft, setNameDraft] = useState(proj.name);
  // Staff breakdown is collapsed by default so the checklist gets the screen; remembered per browser.
  const [showStaff, setShowStaffRaw] = useState(false);
  useEffect(() => { try { setShowStaffRaw(localStorage.getItem("detail.showStaff") === "1"); } catch {} }, []);
  function setShowStaff(f) { setShowStaffRaw((v) => { const n = f(v); try { localStorage.setItem("detail.showStaff", n ? "1" : "0"); } catch {} return n; }); }
  const [sheetBusy, setSheetBusy] = useState(false), [sheetMsg, setSheetMsg] = useState("");

  async function pushSheet() {
    setSheetBusy(true); setSheetMsg("");
    try {
      const r = await onPushSheet(proj.id);
      setSheetMsg(r.pushed ? `Đã đồng bộ tab "${r.tab}": Sheet → App ${r.created + r.updated} thay đổi, App → Sheet ${r.pushed} dòng${r.conflicts.length ? ` · ${r.conflicts.length} dòng sửa cả hai phía, đã lấy bản App` : ""}.` : `Tab "${r.tab}" đã khớp với App${r.created + r.updated ? ` (đã nhận ${r.created + r.updated} thay đổi từ Sheet)` : ""}.`);
    } catch (e) { setSheetMsg(e.message); }
    setSheetBusy(false);
  }

  useEffect(() => { setNameDraft(proj.name); }, [proj.id, proj.name]);

  function commitName() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== proj.name) onSetName(proj.id, trimmed);
    else setNameDraft(proj.name);
  }

  function toggleSort(k) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }

  const x = stats(tasks, proj.id), pct = x.tot === 0 ? 0 : Math.round((x.dn / x.tot) * 100);

  useEffect(() => {
    if (hlId && rr.current[hlId]) rr.current[hlId].scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hlId]);

  const hmOpts = [...new Set(tasks.map((t) => (t.hm || "").trim()).filter(Boolean))].sort();
  const accOpts = [...new Set(tasks.flatMap((t) => (t.acc || "").split(",").map((s) => s.trim()).filter(Boolean)))].sort();

  let vis = fl ? tasks.filter((t) => hasC(t) && urg(t) === fl) : tasks;
  if (hmF) vis = vis.filter((t) => (t.hm || "").trim() === hmF);
  if (accF) vis = vis.filter((t) => (t.acc || "").split(",").map((s) => s.trim()).includes(accF));
  if (stF) vis = vis.filter((t) => t.st === stF);
  if (dlFrom) vis = vis.filter((t) => t.dl && t.dl >= dlFrom);
  if (dlTo) vis = vis.filter((t) => t.dl && t.dl <= dlTo);
  vis = vis.slice().sort((a, b) => TASK_SORTERS[sortKey](a, b) * (sortDir === "asc" ? 1 : -1));
  const anyFilter = hmF || accF || stF || dlFrom || dlTo;
  function clearFilters() { setHmF(""); setAccF(""); setStF(""); setDlFrom(""); setDlTo(""); }

  const CH = [
    { k: "over", l: "Quá hạn", v: x.ov, I: AlertTriangle, t: "text-rose-700", r: "ring-rose-200", b: "bg-rose-50" },
    { k: "today", l: "Đến hạn hôm nay", v: x.td, I: Clock, t: "text-orange-700", r: "ring-orange-200", b: "bg-orange-50" },
    { k: "soon", l: "Sắp đến hạn (≤3 ngày)", v: x.sn, I: CalendarClock, t: "text-amber-700", r: "ring-amber-200", b: "bg-amber-50" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-8">
      <button onClick={() => router.push("/overview")} className="mb-2 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"><ArrowLeft size={13}/> Tổng quan</button>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <input
            value={nameDraft}
            onChange={e=>setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e=>{ if (e.key==="Enter") e.currentTarget.blur(); if (e.key==="Escape") { setNameDraft(proj.name); e.currentTarget.blur(); } }}
            className="-mx-1 w-full rounded border border-transparent bg-transparent px-1 text-xl font-bold text-slate-900 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none"
          />
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">Người phụ trách:
              {canAssignOwner(myRole) ? (
                <select value={proj.owner||""} onChange={e=>onSetOwner(proj.id,e.target.value)} className="rounded border border-transparent bg-transparent py-0.5 font-medium text-slate-700 hover:border-slate-200 focus:border-indigo-400 focus:outline-none">
                  <option value="">Chưa gán</option>
                  {users.map(u=><option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              ) : (
                <span className="font-medium text-slate-700">{(users.find(u=>u.id===proj.owner)||{}).username||"Chưa gán"}</span>
              )}
            </span>
            <span className="flex items-center gap-1.5">Deadline dự án:
              <DateInput value={proj.dl} onCommit={v=>onSetDeadline(proj.id,v)} className="rounded border border-transparent bg-transparent py-0.5 text-slate-700 hover:border-slate-200 focus:border-indigo-400 focus:outline-none"/>
            </span>
            <span className="flex flex-wrap items-center gap-2">
                {proj.sheet_tab_name && <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"><FileSpreadsheet size={12}/> Sheet: {proj.sheet_tab_name}</span>}
                <button onClick={pushSheet} disabled={sheetBusy} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Upload size={12}/>{sheetBusy ? "Đang xử lý…" : proj.sheet_tab_name ? "Đồng bộ ngay" : "Đồng bộ với Google Sheet"}</button>
                {sheetMsg && <span className="text-xs text-slate-500">{sheetMsg}</span>}
            </span>
          </div>
        </div>
        {canDelProj(myRole) && <button onClick={() => onDelP(proj.id)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50"><Trash2 size={14}/> Xoá dự án</button>}
      </div>

      <div className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-baseline gap-4 text-sm">
            <span><b className="text-lg tabular-nums text-slate-900">{x.tot}</b> <span className="text-slate-500">việc</span></span>
            <span><b className="text-lg tabular-nums text-emerald-600">{x.dn}</b> <span className="text-slate-500">xong</span></span>
            <span><b className="text-lg tabular-nums text-slate-900">{x.nd}</b> <span className="text-slate-500">chưa xong</span></span>
          </div>
          <div className="flex w-44 items-center gap-2" title="Tiến độ">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{width:`${pct}%`}}/></div>
            <span className="text-sm font-semibold tabular-nums text-slate-700">{pct}%</span>
          </div>
          <span className="hidden h-5 w-px bg-slate-200 sm:block"/>
          <div className="flex flex-wrap items-center gap-1.5">
            {CH.map((c) => { const a = fl === c.k, I = c.I; return (
              <button key={c.k} onClick={() => sfl(a ? null : c.k)} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${a ? `${c.b} ${c.t} ${c.r}` : c.v ? `bg-white ${c.t} ring-slate-200 hover:bg-slate-50` : "bg-white text-slate-400 ring-slate-200 hover:bg-slate-50"}`}><I size={12}/><span className="tabular-nums font-semibold">{c.v}</span>{c.l}</button>
            );})}
            {fl && <button onClick={() => sfl(null)} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-slate-400 hover:text-slate-600"><X size={12}/> Bỏ lọc</button>}
          </div>
          <button onClick={() => setShowStaff((v) => !v)} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700">
            <Users size={13}/> Theo nhân sự {showStaff ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>
        </div>
        {showStaff && <div className="mt-2.5 border-t border-slate-100 pt-2.5"><StaffChart tasks={tasks} active={accF} onPick={setAccF}/></div>}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <h2 className="mr-1 text-sm font-semibold text-slate-900">Checklist</h2>
        <span className="flex items-center gap-1 font-medium text-slate-400"><Filter size={12}/> Lọc:</span>
        <select value={hmF} onChange={e=>setHmF(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"><option value="">Hạng mục: Tất cả</option>{hmOpts.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <select value={accF} onChange={e=>setAccF(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"><option value="">Acc: Tất cả</option>{accOpts.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <select value={stF} onChange={e=>setStF(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"><option value="">Trạng thái: Tất cả</option>{STO.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <span className="flex items-center gap-1 text-slate-400">Deadline:<input type="date" value={dlFrom} onChange={e=>setDlFrom(e.target.value)} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs focus:border-indigo-400 focus:outline-none"/>–<input type="date" value={dlTo} onChange={e=>setDlTo(e.target.value)} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs focus:border-indigo-400 focus:outline-none"/></span>
        {anyFilter && <button onClick={clearFilters} className="flex items-center gap-1 rounded-md px-2 py-1 text-slate-400 hover:text-slate-600"><X size={12}/> Xoá lọc</button>}
        <button onClick={() => onAdd(proj.id)} className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"><Plus size={14}/> Thêm việc</button>
      </div>

      <div className="max-h-[calc(100vh-200px)] min-h-[320px] overflow-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-xs">
          <colgroup><col className="w-12"/><col className="w-28"/><col/><col className="w-[130px]"/><col className="w-28"/><col className="w-[130px]"/><col className="w-[140px]"/><col className="w-[22%]"/><col className="w-14"/></colgroup>
          <thead className="sticky top-0 z-10"><tr className="bg-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-600 shadow-[inset_0_-2px_0_var(--color-slate-300)] [&>th]:border-r [&>th]:border-slate-200 [&>th:last-child]:border-r-0">
            <th className="px-2.5 py-2 font-semibold">#</th>
            <Th label="Hạng mục" k="hm" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Đầu việc / Việc con" k="dv" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Deadline" k="dl" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Acc" k="acc" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Trạng thái" k="st" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Tình trạng" k="urg" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Ghi chú" k="gc" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <th/>
          </tr></thead>
          <tbody>
            {!vis.length && <tr><td colSpan={9} className="px-4 py-6 text-center text-xs text-slate-400">{fl||anyFilter ? "Không có việc nào khớp bộ lọc." : 'Chưa có đầu việc nào — bấm "Thêm việc".'}</td></tr>}
            {vis.map((t, i) => (
              <TaskRow key={t.id} t={t} idx={i+1} hl={t.id===hlId} canDel={canDelTask({by:t.by}, myRole, myId)}
                refCb={el=>rr.current[t.id]=el} onUpd={onUpd} onAddSub={onAddSub} onUpdSub={onUpdSub} onDelSub={onDelSub} onDelT={onDelT}/>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
