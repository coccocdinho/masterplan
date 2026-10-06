"use client";
import { Plus, Trash2 } from "lucide-react";
import { done, hasC, rowAccent } from "../lib/util";
import SP from "./SP";
import UB from "./UB";
import SubRow from "./SubRow";
import AutoTextarea from "./AutoTextarea";
import DateInput from "./DateInput";

export const CELL = "border-r border-slate-200 px-1 py-1 last:border-r-0";
export const INP = "w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 leading-5 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:outline-none";

export default function TaskRow({ t, idx, hl, canDel, refCb, onUpd, onAddSub, onUpdSub, onDelSub, onDelT }) {
  const dn = done(t);
  const muted = dn ? "text-slate-400" : "";
  return (
    <>
      <tr ref={refCb} className={`group align-top border-t-2 border-slate-300 first:border-t-0 ${hl ? "bg-amber-100" : "bg-white hover:bg-slate-50"}`}>
        <td className={`${CELL} relative pl-2.5 before:absolute before:inset-y-0 before:left-0 before:w-1 ${rowAccent(t)}`}>
          <span className={`block py-0.5 leading-5 tabular-nums font-semibold ${dn ? "text-slate-400" : "text-slate-700"}`}>{idx}</span>
        </td>
        <td className={CELL}><AutoTextarea value={t.hm||""} onChange={e=>onUpd(t.id,{hm:e.target.value})} className={`${INP} ${dn ? "text-slate-400" : "text-slate-600"}`}/></td>
        <td className={CELL}><AutoTextarea value={t.dv||""} onChange={e=>onUpd(t.id,{dv:e.target.value})} placeholder="Đầu việc" className={`${INP} text-[13px] font-semibold ${dn ? "text-slate-400 line-through" : "text-slate-900"}`}/></td>
        <td className={CELL}><DateInput value={t.dl} onCommit={v=>onUpd(t.id,{dl:v})} className={`${INP} tabular-nums ${t.dl ? muted : "text-slate-300"}`}/></td>
        <td className={CELL}><AutoTextarea value={t.acc||""} onChange={e=>onUpd(t.id,{acc:e.target.value})} className={`${INP} ${muted}`}/></td>
        <td className={CELL}><SP val={t.st} onChange={v=>onUpd(t.id,{st:v})} compact/></td>
        <td className={CELL}>{hasC(t) ? <UB t={t} compact/> : <span className="block py-0.5 leading-5 text-slate-300">—</span>}</td>
        <td className={CELL}><AutoTextarea value={t.gc||""} onChange={e=>onUpd(t.id,{gc:e.target.value})} placeholder="—" className={`${INP} ${dn ? "text-slate-400" : "text-slate-600"}`}/></td>
        <td className={CELL}>
          <div className="flex items-center justify-end gap-0.5 py-0.5 opacity-40 transition group-hover:opacity-100">
            <button onClick={()=>onAddSub(t.id)} title="Thêm việc con" className="rounded p-0.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"><Plus size={14}/></button>
            {canDel && <button onClick={()=>onDelT(t.id)} title="Xoá đầu việc" className="rounded p-0.5 text-slate-500 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14}/></button>}
          </div>
        </td>
      </tr>
      {(t.subtasks||[]).map((s, j) => <SubRow key={s.id} t={t} s={s} num={`${idx}.${j+1}`} onUpdSub={onUpdSub} onDelSub={onDelSub}/>)}
    </>
  );
}
