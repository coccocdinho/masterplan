"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, X, Plus, AlertTriangle, Clock, CalendarClock, Filter } from "lucide-react";
import { stats, urg, hasC, TASK_SORTERS } from "../lib/util";
import { canDelProj, canDelTask, canAssignOwner } from "../lib/permissions";
import { STO } from "../lib/constants";
import Th from "./Th";
import TaskRow from "./TaskRow";
import StaffChart from "./StaffChart";

export default function Detail({ proj, tasks, users, myRole, myId, onDelT, onAdd, onUpd, onAddSub, onUpdSub, onDelSub, onDelP, onSetOwner, onSetDeadline, hlId }) {
  const router = useRouter();
  const rr = useRef({});
  const [fl, sfl] = useState(null);
  const [hmF, setHmF] = useState(""), [accF, setAccF] = useState(""), [stF, setStF] = useState(""), [dlFrom, setDlFrom] = useState(""), [dlTo, setDlTo] = useState("");
  const [sortKey, setSortKey] = useState("urg"), [sortDir, setSortDir] = useState("asc");

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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
      <button onClick={() => router.push("/overview")} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"><ArrowLeft size={15}/> Tổng quan</button>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{proj.name}</h1>
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
              <input type="date" value={proj.dl||""} onChange={e=>onSetDeadline(proj.id,e.target.value)} className="rounded border border-transparent bg-transparent py-0.5 text-slate-700 hover:border-slate-200 focus:border-indigo-400 focus:outline-none"/>
            </span>
          </div>
        </div>
        {canDelProj(myRole) && <button onClick={() => onDelP(proj.id)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50"><Trash2 size={14}/> Xoá dự án</button>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-wrap gap-8">
            {[{ l: "Tổng việc", v: x.tot, c: "text-slate-900" }, { l: "Đã xong", v: x.dn, c: "text-emerald-600" }, { l: "Chưa xong", v: x.nd, c: "text-slate-900" }].map((i) => (
              <div key={i.l}><div className={`text-3xl font-bold tabular-nums leading-none ${i.c}`}>{i.v}</div><div className="mt-1 text-sm text-slate-500">{i.l}</div></div>
            ))}
          </div>
          <div className="min-w-[180px] flex-1 max-w-xs">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Tiến độ</span><span className="font-semibold tabular-nums text-slate-700">{pct}%</span></div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{width:`${pct}%`}}/></div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {CH.map((c) => { const a = fl === c.k, I = c.I; return (
            <button key={c.k} onClick={() => sfl(a ? null : c.k)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${a ? `${c.b} ${c.t} ${c.r}` : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"}`}><I size={13}/><span className="tabular-nums font-semibold">{c.v}</span>{c.l}</button>
          );})}
          {fl && <button onClick={() => sfl(null)} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600"><X size={14}/> Bỏ lọc</button>}
        </div>
      </div>

      <StaffChart tasks={tasks}/>

      <div className="mt-6 mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">Checklist</h2><button onClick={() => onAdd(proj.id)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Plus size={15}/> Thêm việc</button></div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
        <span className="flex items-center gap-1 font-medium text-slate-400"><Filter size={12}/> Lọc:</span>
        <select value={hmF} onChange={e=>setHmF(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"><option value="">Hạng mục: Tất cả</option>{hmOpts.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <select value={accF} onChange={e=>setAccF(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"><option value="">Acc: Tất cả</option>{accOpts.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <select value={stF} onChange={e=>setStF(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"><option value="">Trạng thái: Tất cả</option>{STO.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <span className="flex items-center gap-1 text-slate-400">Deadline:<input type="date" value={dlFrom} onChange={e=>setDlFrom(e.target.value)} className="rounded-md border border-slate-200 px-1.5 py-1 text-xs focus:border-indigo-400 focus:outline-none"/>–<input type="date" value={dlTo} onChange={e=>setDlTo(e.target.value)} className="rounded-md border border-slate-200 px-1.5 py-1 text-xs focus:border-indigo-400 focus:outline-none"/></span>
        {anyFilter && <button onClick={clearFilters} className="flex items-center gap-1 rounded-md px-2 py-1 text-slate-400 hover:text-slate-600"><X size={12}/> Xoá lọc</button>}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-fixed text-xs">
          <colgroup><col className="w-6"/><col className="w-14"/><col/><col className="w-32"/><col className="w-24"/><col className="w-28"/><col className="w-32"/><col className="w-20"/><col className="w-10"/></colgroup>
          <thead><tr className="border-b-2 border-indigo-200 bg-indigo-50/70 text-left text-[11px] uppercase tracking-wide text-indigo-900">
            <th className="px-2 py-1.5 font-medium">#</th>
            <Th label="Hạng mục" k="hm" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Đầu việc / Việc con" k="dv" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Deadline" k="dl" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Acc" k="acc" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Trạng thái" k="st" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
            <Th label="Tình trạng deadline" k="urg" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>
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
