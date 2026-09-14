"use client";
import { useApp } from "../../../lib/AppStateContext";
import Urgent from "../../../components/Urgent";

export default function UrgentPage() {
  const { D } = useApp();
  return <Urgent D={D}/>;
}
