"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Check, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { apiPost } from "../lib/apiClient";

const STARTERS = [
  "Hôm nay cần đôn đốc việc gì?",
  "Tạo dự án mới tên \"...\"",
  "Dự án ... đang có bao nhiêu việc quá hạn?",
];

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

export default function BotWidget() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history, pendingConfirm, busy]);

  const visible = history
    .map((m) => ({ role: m.role, text: textOf(m.content) }))
    .filter((m) => m.text);

  async function send(userText) {
    if (busy) return;
    setErr(""); setBusy(true);
    setHistory((h) => [...h, { role: "user", content: userText }]);
    try {
      const r = await apiPost("/api/bot", { messages: history, userText });
      setHistory(r.messages);
      setPendingConfirm(r.pendingConfirm || null);
      if (r.error) setErr(r.error);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  async function answerConfirm(accepted) {
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      const r = await apiPost("/api/bot", { messages: history, confirm: { toolUseId: pendingConfirm.toolUseId, accepted, otherResults: pendingConfirm.otherResults } });
      setHistory(r.messages);
      setPendingConfirm(r.pendingConfirm || null);
      if (r.error) setErr(r.error);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  function submit(e) {
    e.preventDefault();
    const t = input.trim();
    if (!t || pendingConfirm) return;
    setInput("");
    send(t);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <div className="mb-3 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-indigo-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2 font-semibold"><Sparkles size={16}/> Trợ lý Master Plan</div>
            <button onClick={() => setOpen(false)} className="text-indigo-100 hover:text-white"><X size={18}/></button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {!visible.length && (
              <div className="rounded-xl bg-indigo-50 px-3 py-2.5 text-sm text-slate-700">
                Xin chào! Tôi giúp tạo dự án, tạo/sửa đầu việc, tra cứu và nhắc việc. Thử hỏi:
                <div className="mt-2 flex flex-col gap-1.5">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-left text-xs text-indigo-700 hover:bg-indigo-50">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {visible.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}>{m.text}</div>
              </div>
            ))}

            {pendingConfirm && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800"><AlertTriangle size={14}/> Xác nhận sửa đầu việc</div>
                <div className="mt-1 text-slate-700">"{pendingConfirm.task.dauViec}" — {pendingConfirm.task.project}</div>
                {pendingConfirm.changes.length ? (
                  <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                    {pendingConfirm.changes.map((c) => (
                      <li key={c.field}><span className="font-medium">{c.label}:</span> {c.from} → <span className="font-medium text-amber-800">{c.to}</span></li>
                    ))}
                  </ul>
                ) : <div className="mt-1.5 text-xs text-slate-500">Không có thay đổi nào.</div>}
                <div className="mt-2.5 flex gap-2">
                  <button disabled={busy} onClick={() => answerConfirm(true)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"><Check size={13}/> Xác nhận lưu</button>
                  <button disabled={busy} onClick={() => answerConfirm(false)} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"><X size={13}/> Huỷ</button>
                </div>
              </div>
            )}

            {busy && <div className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 size={13} className="animate-spin"/> Đang xử lý…</div>}
            {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>}
            <div ref={bottomRef}/>
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200 px-3 py-2.5">
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={pendingConfirm ? "Xác nhận ở trên trước đã…" : "Nhắn cho trợ lý…"}
              disabled={busy || !!pendingConfirm}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-slate-50"
            />
            <button type="submit" disabled={busy || !!pendingConfirm || !input.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"><Send size={15}/></button>
          </form>
        </div>
      )}

      <button onClick={() => setOpen((o) => !o)} className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-500">
        {open ? <X size={22}/> : <Bot size={24}/>}
      </button>
    </div>
  );
}
