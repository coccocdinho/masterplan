"use client";
import { staffStats } from "../lib/util";
import StackChart from "./StackChart";

export default function StaffChart({ tasks }) {
  const rows = staffStats(tasks).map((r) => ({ name: r.name, total: r.tot, done: r.dn, overdue: r.ov, running: r.nd - r.ov }));
  return (
    <div className="mt-6">
      <StackChart title="Thống kê theo nhân sự" rows={rows} empty="Chưa có đầu việc nào để thống kê."/>
    </div>
  );
}
