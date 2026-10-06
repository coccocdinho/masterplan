"use client";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function Th({ label, k, sortKey, sortDir, onSort, className }) {
  const active = sortKey === k;
  return (
    <th className={`font-semibold ${className || "px-2.5 py-2"}`}>
      <button onClick={() => onSort(k)} className="flex items-center gap-1 whitespace-nowrap hover:text-indigo-700">
        {label}{active ? (sortDir === "asc" ? <ChevronUp size={11}/> : <ChevronDown size={11}/>) : <span className="w-[11px]"/>}
      </button>
    </th>
  );
}
