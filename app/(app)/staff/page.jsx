"use client";
import { useApp } from "../../../lib/AppStateContext";
import StaffOverview from "../../../components/StaffOverview";

export default function StaffPage() {
  const { D } = useApp();
  return <StaffOverview D={D}/>;
}
