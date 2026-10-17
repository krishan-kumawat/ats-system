import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ objectApiName: string }> }
) {
  const resolvedParams = await params;
  const { objectApiName } = resolvedParams;


  // Normalize the object API name to its singular representation
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


  const session = await getSession();
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/metadata/${normName}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });


    if (!res.ok) {
      if (res.status === 401) {
        const { destroySession } = await import("@/lib/auth");
        await destroySession();
      }
      return NextResponse.json({ error: `Failed to fetch metadata for ${normName} from backend` }, { status: res.status });
    }


    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[Metadata API Proxy]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



