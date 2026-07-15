import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ATSClient from "@/components/ats/ATSClient";
import { fetchInitialData } from "@/app/actions/data";

export default async function ATSPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const initialData = await fetchInitialData();

  return <ATSClient user={user} initialData={initialData} />;
}
