import { redirect } from "next/navigation";
import { isAuthenticated } from "../../lib/auth";
import CreatorClient from "./creator-client";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  if (!(await isAuthenticated())) redirect("/login");
  return <CreatorClient />;
}
