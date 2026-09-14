"use client";
import { niceStep, roundedTopPath, truncLabel } from "../lib/util";

const CHART_LEGEND = [
  { k: "done", label: "Hoàn thành", dot: "bg-emerald-500" },
  { k: "running", label: "Đang chạy", dot: "bg-blue-500" },
  { k: "overdue", label: "Quá hạn", dot: "bg-rose-500" },
];
const CHART_HEX = { done: "#10b981", running: "#3b82f6", overdue: "#f43f5e" };

export default function StackChart({ title, rows, empty }) {
  const H = 260, padTop = 14, padBottom = 30, padLeft = 34, padRight = 8, bandW = 64, barW = 24, gap = 2;
  const plotH = H - padTop - padBottom;
  const maxVal = Math.max(0, ...rows.map((r) => r.total));
  const step = niceStep(Math.max(maxVal / 4, 1));
  const yMax = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => step * i);
  const plotW = Math.max(rows.length * bandW, 200);
  const W = plotW + padLeft + padRight;
  const toY = (v) => padTop + plotH - (v / yMax) * plotH;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <div className="flex gap-3 text-xs text-slate-500">
          {CHART_LEGEND.map((l) => <span key={l.k} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${l.dot}`}/>{l.label}</span>)}
        </div>
      </div>
      {!rows.length ? (
        <div className="mt-4 py-10 text-center text-sm text-slate-400">{empty}</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
            {ticks.map((t, ti) => { const y = toY(t); return (
              <g key={ti}>
                <line x1={padLeft} x2={W - padRight} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1}/>
                <text x={padLeft - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#94a3b8">{Math.round(t)}</text>
              </g>
            );})}
            <line x1={padLeft} x2={W - padRight} y1={toY(0)} y2={toY(0)} stroke="#c3c2b7" strokeWidth={1}/>
            {rows.map((r, i) => {
              const cx = padLeft + i * bandW + bandW / 2, x = cx - barW / 2;
              const segs = [{ k: "done", v: r.done }, { k: "running", v: r.running }, { k: "overdue", v: r.overdue }].filter((s) => s.v > 0);
              let cum = 0;
              const lastIdx = segs.length - 1;
              return (
                <g key={r.name}>
                  {segs.map((s, si) => {
                    const yBotRaw = toY(cum), yTopRaw = toY(cum + s.v);
                    cum += s.v;
                    const yTop = si === 0 ? yTopRaw : yTopRaw + gap;
                    const h = yBotRaw - yTop;
                    if (h <= 0) return null;
                    const label = `${r.name} — ${CHART_LEGEND.find((l) => l.k === s.k).label}: ${s.v}`;
                    return si === lastIdx
                      ? <path key={s.k} d={roundedTopPath(x, yTop, barW, h, 4)} fill={CHART_HEX[s.k]}><title>{label}</title></path>
                      : <rect key={s.k} x={x} y={yTop} width={barW} height={h} fill={CHART_HEX[s.k]}><title>{label}</title></rect>;
                  })}
                  <text x={cx} y={H - padBottom + 16} textAnchor="middle" fontSize={11} fill="#64748b"><title>{r.name}</title>{truncLabel(r.name, 10)}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
