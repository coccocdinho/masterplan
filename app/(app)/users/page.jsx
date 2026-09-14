"use client";
import { useApp } from "../../../lib/AppStateContext";
import UserPage from "../../../components/UserPage";

export default function UsersPage() {
  const { D, me, addUser, resetPw, delUser } = useApp();
  return <UserPage D={D} me={me} myRole={me.role} onAdd={addUser} onReset={resetPw} onDel={delUser}/>;
}
