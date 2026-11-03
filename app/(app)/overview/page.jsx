"use client";
import { useApp } from "../../../lib/AppStateContext";
import Overview from "../../../components/Overview";

export default function OverviewPage() {
  const { D, me, setShowNP, setShowIM, setProjPriority } = useApp();
  return <Overview D={D} me={me} onNew={() => setShowNP(true)} onImp={() => setShowIM(true)} onSetPriority={setProjPriority}/>;
}
