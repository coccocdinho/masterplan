import { redirect } from "next/navigation";
import { getSession } from "../../../lib/auth";
import Login from "../../../components/Login";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/overview");
  return <Login />;
}
