"use client";
import { useEffect, useRef, useState } from "react";

// Date cell that only commits when the user is done (blur / Enter), not on every
// change: Chrome's picker changes the value as you page through months, and saving
// each of those re-sorts the table under the open picker, closing it and letting the
// next click land on whichever row slid into place.
export default function DateInput({ value, onCommit, className = "", ...props }) {
  const [draft, setDraft] = useState(value || "");
  const latest = useRef({ draft, value, onCommit });
  latest.current = { draft, value, onCommit };

  useEffect(() => { setDraft(value || ""); }, [value]);
  // Still commit if the row unmounts (e.g. filtered out) while a draft is pending.
  useEffect(() => () => { const l = latest.current; if (l.draft !== (l.value || "")) l.onCommit(l.draft); }, []);

  function commit() { if (draft !== (value || "")) onCommit(draft); }

  return (
    <input type="date" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setDraft(value || ""); } }}
      className={className} {...props}/>
  );
}
