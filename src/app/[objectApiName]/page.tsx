import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchInitialData } from "@/app/actions/data";
import ObjectWorkspace from "@/components/ats/ObjectWorkspace";

interface PageProps {
  params: Promise<{
    objectApiName: string;
  }>;
}

export default async function DynamicObjectPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { objectApiName } = resolvedParams;

  const user = await getSession();
  if (!user) redirect("/login");

  // 1. Fetch authorized navigation tabs for this user
  const tabsRes = await fetch("http://localhost:3000/api/v1/navigation/tabs", {
    headers: { Authorization: `Bearer ${user.accessToken}` },
    cache: "no-store",
  });

  if (tabsRes.ok) {
    const tabs = await tabsRes.json();

    // Normalize objectApiName
    let normName = objectApiName;
    const lower = normName.toLowerCase();
    if (lower === "jobs") normName = "Job";
    else if (lower === "candidates") normName = "Candidate";
    else if (lower === "departments") normName = "Department";
    else if (lower === "users") normName = "User";
    else if (lower === "profiles") normName = "Profile";
    else if (lower === "roles") normName = "Role";
    else if (lower === "auditlogs" || lower === "auditlog") normName = "AuditLog";
    else if (lower === "analytics") normName = "Analytics";
    else if (lower === "accounts" || lower === "account") normName = "Account";

    const isAllowed = tabs.some((t: any) => t.apiName === normName);
    if (!isAllowed) {
      redirect("/");
    }
  }

  const initialData = await fetchInitialData();

  return (
    <ObjectWorkspace
      objectApiName={objectApiName}
      user={user}
      initialData={initialData}
    />
  );
}
