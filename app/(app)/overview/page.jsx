"use client";
import { useApp } from "../../../lib/AppStateContext";
import Overview from "../../../components/Overview";

export default function OverviewPage() {
  const { D, setShowNP, setShowIM } = useApp();
  return <Overview D={D} onNew={() => setShowNP(true)} onImp={() => setShowIM(true)}/>;
}
