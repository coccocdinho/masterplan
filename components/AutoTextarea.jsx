"use client";
import { useEffect, useRef } from "react";

export default function AutoTextarea({ value, onChange, className = "", ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // scrollHeight excludes the element's own border, so a border-box element
    // needs it added back or the box ends up ~border-width short and clips.
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + border}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={1}
      className={`resize-none overflow-hidden break-words ${className}`}
      {...props}
    />
  );
}
