"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { done, fmtD, rowAccent } from "../lib/util";
import { ST } from "../lib/constants";
import SP from "./SP";
import UB from "./UB";
import AutoTextarea from "./AutoTextarea";
import DateInput from "./DateInput";
import { CELL, INP } from "./TaskRow";

export default function SubRow({ t, s, num, onUpdSub, onDelSub }) {
  const [err, setErr] = useState(false);
  function trySetDl(val) {
    if (t.dl && val && val > t.dl) { setErr(true); return; }
    setErr(false);
    onUpdSub(t.id, s.id, { dl: val });
  }
  const sdn = done(s);
  const muted = sdn ? "text-slate-400" : "";
  return (
    <tr className="group align-top border-t border-slate-200 bg-white hover:bg-slate-50">
      <td className={`${CELL} relative pl-2.5 before:absolute before:inset-y-0 before:left-0 before:w-1 ${rowAccent(s)}`}>
        <span className="block py-0.5 leading-5 tabular-nums text-[11px] text-slate-400">{num}</span>
      </td>
      <td className={CELL}/>
      <td className={CELL}>
        <div className="flex items-start pl-4">
          <span className="mt-[9px] mr-1 h-px w-2.5 shrink-0 bg-slate-300"/>
          <AutoTextarea value={s.text} onChange={e=>onUpdSub(t.id,s.id,{text:e.target.value})} placeholder="Việc con" className={`${INP} min-w-0 flex-1 ${sdn ? "text-slate-400 line-through" : "text-slate-700"}`}/>
        </div>
      </td>
      <td className={CELL}>
        <DateInput value={s.dl} onCommit={trySetDl} className={`${INP} tabular-nums ${err ? "!border-rose-400 text-rose-600" : s.dl ? muted : "text-slate-300"}`}/>
        {err && <div className="mt-0.5 px-1.5 text-[10px] leading-tight text-rose-600">Vượt hạn việc cha ({fmtD(t.dl)}).</div>}
      </td>
      <td className={CELL}><AutoTextarea value={s.acc||""} onChange={e=>onUpdSub(t.id,s.id,{acc:e.target.value})} className={`${INP} ${muted}`}/></td>
      <td className={CELL}><SP val={s.st||ST.N} onChange={v=>onUpdSub(t.id,s.id,{st:v})} compact/></td>
      <td className={CELL}>{(s.text||"").trim() ? <UB t={s} compact/> : <span className="block py-0.5 leading-5 text-slate-300">—</span>}</td>
      <td className={CELL}><AutoTextarea value={s.gc||""} onChange={e=>onUpdSub(t.id,s.id,{gc:e.target.value})} placeholder="—" className={`${INP} ${sdn ? "text-slate-400" : "text-slate-600"}`}/></td>
      <td className={CELL}>
        <div className="flex justify-end py-0.5 opacity-40 transition group-hover:opacity-100">
          <button onClick={()=>onDelSub(t.id,s.id)} title="Xoá việc con" className="rounded p-0.5 text-slate-500 hover:bg-rose-50 hover:text-rose-500"><X size={14}/></button>
        </div>
      </td>
    </tr>
  );
}
