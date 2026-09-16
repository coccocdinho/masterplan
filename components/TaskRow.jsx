"use client";
import { Plus, Trash2 } from "lucide-react";
import { done, hasC, rowSt } from "../lib/util";
import SP from "./SP";
import UB from "./UB";
import SubRow from "./SubRow";
import AutoTextarea from "./AutoTextarea";

export default function TaskRow({ t, idx, hl, canDel, refCb, onUpd, onAddSub, onUpdSub, onDelSub, onDelT }) {
  const rs = rowSt(t), dn = done(t);
  return (
    <>
      <tr ref={refCb} className={`border-b border-slate-100 last:border-0 align-top ${rs.bg} ${rs.bd} ${rs.fade ? "opacity-60" : ""} ${hl ? "!bg-amber-100 !opacity-100 ring-1 ring-inset ring-amber-400" : ""}`}>
        <td className="px-2 py-1.5 tabular-nums"><span className={dn?"text-slate-300":"font-medium text-slate-500"}>{idx}</span></td>
        <td className="px-2 py-1"><AutoTextarea value={t.hm||""} onChange={e=>onUpd(t.id,{hm:e.target.value})} className={`w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none ${dn?"text-slate-400":""}`}/></td>
        <td className="px-2 py-1"><AutoTextarea value={t.dv||""} onChange={e=>onUpd(t.id,{dv:e.target.value})} placeholder="Đầu việc" className={`w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none ${dn?"font-medium text-slate-400 line-through":"font-medium text-slate-800"}`}/></td>
        <td className="px-2 py-1"><input type="date" value={t.dl||""} onChange={e=>onUpd(t.id,{dl:e.target.value})} className={`w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none ${dn?"text-slate-400":""}`}/></td>
        <td className="px-2 py-1"><AutoTextarea value={t.acc||""} onChange={e=>onUpd(t.id,{acc:e.target.value})} className={`w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none ${dn?"text-slate-400":""}`}/></td>
        <td className="px-2 py-1"><SP val={t.st} onChange={v=>onUpd(t.id,{st:v})}/></td>
        <td className="px-2 py-1">{hasC(t)?<UB t={t}/>:<span className="text-slate-300">—</span>}</td>
        <td className="px-2 py-1"><AutoTextarea value={t.gc||""} onChange={e=>onUpd(t.id,{gc:e.target.value})} placeholder="—" className={`w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none ${dn?"text-slate-400":"text-slate-600"}`}/></td>
        <td className="px-1.5 py-1">
          <div className="flex items-center justify-end gap-0.5">
            <button onClick={()=>onAddSub(t.id)} title="Thêm việc con" className="rounded p-0.5 text-slate-300 hover:bg-indigo-50 hover:text-indigo-600"><Plus size={13}/></button>
            {canDel && <button onClick={()=>onDelT(t.id)} title="Xoá đầu việc" className="rounded p-0.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={13}/></button>}
          </div>
        </td>
      </tr>
      {(t.subtasks||[]).map((s) => <SubRow key={s.id} t={t} s={s} onUpdSub={onUpdSub} onDelSub={onDelSub}/>)}
    </>
  );
}
