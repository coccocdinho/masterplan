"use client";
import { useState } from "react";
import { CornerDownRight, X } from "lucide-react";
import { done, fmtD } from "../lib/util";
import { ST } from "../lib/constants";
import SP from "./SP";
import UB from "./UB";

export default function SubRow({ t, s, onUpdSub, onDelSub }) {
  const [err, setErr] = useState(false);
  function trySetDl(val) {
    if (t.dl && val && val > t.dl) { setErr(true); return; }
    setErr(false);
    onUpdSub(t.id, s.id, { dl: val });
  }
  const sdn = done(s);
  return (
    <tr className="border-b border-slate-100 last:border-0 align-top bg-slate-50/40">
      <td className="px-2 py-1"/>
      <td className="px-2 py-1"/>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          <CornerDownRight size={11} className="shrink-0 text-slate-300"/>
          <input value={s.text} onChange={e=>onUpdSub(t.id,s.id,{text:e.target.value})} placeholder="Việc con" className={`min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none ${sdn?"text-slate-400 line-through":"text-slate-700"}`}/>
        </div>
      </td>
      <td className="px-2 py-1">
        <input type="date" value={s.dl||""} onChange={e=>trySetDl(e.target.value)} className={`w-full rounded border bg-transparent px-1 py-0.5 focus:outline-none ${err?"border-rose-400 text-rose-600":"border-transparent hover:border-slate-200 focus:border-indigo-400"} ${sdn?"text-slate-400":""}`}/>
        {err && <div className="mt-0.5 text-[10px] leading-tight text-rose-600">Vượt hạn việc cha ({fmtD(t.dl)}).</div>}
      </td>
      <td className="px-2 py-1"><input value={s.acc||""} onChange={e=>onUpdSub(t.id,s.id,{acc:e.target.value})} className={`w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none ${sdn?"text-slate-400":""}`}/></td>
      <td className="px-2 py-1"><SP val={s.st||ST.N} onChange={v=>onUpdSub(t.id,s.id,{st:v})}/></td>
      <td className="px-2 py-1">{(s.text||"").trim()?<UB t={s}/>:<span className="text-slate-300">—</span>}</td>
      <td className="px-2 py-1"><input value={s.gc||""} onChange={e=>onUpdSub(t.id,s.id,{gc:e.target.value})} placeholder="—" className={`w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none ${sdn?"text-slate-400":"text-slate-600"}`}/></td>
      <td className="px-1.5 py-1"><button onClick={()=>onDelSub(t.id,s.id)} title="Xoá việc con" className="rounded p-0.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><X size={13}/></button></td>
    </tr>
  );
}
