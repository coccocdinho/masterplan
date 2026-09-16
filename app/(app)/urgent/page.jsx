"use client";
import { useApp } from "../../../lib/AppStateContext";
import Urgent from "../../../components/Urgent";

export default function UrgentPage() {
  const { D, me } = useApp();
  return <Urgent D={D} me={me}/>;
}
