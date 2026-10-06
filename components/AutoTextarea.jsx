"use client";
import { useEffect, useRef } from "react";

export default function AutoTextarea({ value, onChange, className = "", ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      // scrollHeight excludes the element's own border, so a border-box element
      // needs it added back or the box ends up ~border-width short and clips.
      const border = el.offsetHeight - el.clientHeight;
      el.style.height = `${el.scrollHeight + border}px`;
    };
    fit();
    // Re-fit when the column width changes (table layout settling, window resize),
    // otherwise wrapped text stays clipped at the height measured on first render.
    let w = el.offsetWidth;
    const ro = new ResizeObserver(() => { if (el.offsetWidth !== w) { w = el.offsetWidth; fit(); } });
    ro.observe(el);
    return () => ro.disconnect();
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
