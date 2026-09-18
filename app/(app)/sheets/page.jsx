"use client";
import { useApp } from "../../../lib/AppStateContext";
import SheetSync from "../../../components/SheetSync";

export default function SheetsPage() {
  const { D, me, reload } = useApp();
  return <SheetSync myRole={me.role} projects={D.projects} onChanged={reload}/>;
}
