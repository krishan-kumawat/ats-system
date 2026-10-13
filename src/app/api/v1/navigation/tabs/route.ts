import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";


export async function GET() {
  const session = await getSession();
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/navigation/tabs`, {
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
      return NextResponse.json({ error: "Failed to fetch from backend" }, { status: res.status });
    }


    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[NavigationTabs API Proxy]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



