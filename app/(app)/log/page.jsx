"use client";
import { useApp } from "../../../lib/AppStateContext";
import Log from "../../../components/Log";

export default function LogPage() {
  const { D, me } = useApp();
  return <Log D={D} myRole={me.role}/>;
}
