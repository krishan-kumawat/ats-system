"use server";

import { getSession } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import { revalidatePath } from "next/cache";

export interface DepartmentItem {
  id: string;
  name: string;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export async function fetchDepartmentsListAction(): Promise<DepartmentItem[]> {
  const session = await getSession();
  if (!session || !session.accessToken) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/departments`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (err) {
    console.error("[fetchDepartmentsListAction]", err);
    return [];
  }
}

export async function fetchDepartmentDetailsAction(
  departmentId: string
): Promise<{ department?: DepartmentItem; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Unauthorized" };

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/departments/${departmentId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { error: errData.message || `Failed to fetch department (${res.status}).` };
    }

    const data = await res.json();
    return { department: data };
  } catch (err: any) {
    console.error("[fetchDepartmentDetailsAction]", err);
    return { error: err.message || "Failed to fetch department details." };
  }
}

export async function createDepartmentAction(input: {
  name: string;
  parentId?: string;
}): Promise<{ department?: DepartmentItem; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Unauthorized" };

  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };

    const payload: { name: string; parentId?: string } = {
      name: input.name.trim(),
    };
    if (input.parentId && input.parentId.trim()) {
      payload.parentId = input.parentId.trim();
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/departments`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const rawMsg = errData.message || errData.error;
      const errMsg = Array.isArray(rawMsg)
        ? rawMsg.join(", ")
        : typeof rawMsg === "string"
        ? rawMsg
        : `Failed to create department (${res.status}).`;
      return { error: errMsg };
    }

    const created = await res.json();
    revalidatePath("/departments");
    revalidatePath("/[objectApiName]");
    revalidatePath("/jobs");

    return { department: created };
  } catch (err: any) {
    console.error("[createDepartmentAction]", err);
    return { error: err.message || "Failed to create department." };
  }
}

export async function updateDepartmentAction(
  departmentId: string,
  input: {
    name?: string;
    parentId?: string | null;
  }
): Promise<{ department?: DepartmentItem; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Unauthorized" };

  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };

    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) {
      payload.name = input.name.trim();
    }
    if (input.parentId !== undefined) {
      payload.parentId = input.parentId && input.parentId.trim() ? input.parentId.trim() : null;
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/departments/${departmentId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const rawMsg = errData.message || errData.error;
      const errMsg = Array.isArray(rawMsg)
        ? rawMsg.join(", ")
        : typeof rawMsg === "string"
        ? rawMsg
        : `Failed to update department (${res.status}).`;
      return { error: errMsg };
    }

    const updated = await res.json();
    revalidatePath("/departments");
    revalidatePath("/[objectApiName]");
    revalidatePath("/jobs");

    return { department: updated };
  } catch (err: any) {
    console.error("[updateDepartmentAction]", err);
    return { error: err.message || "Failed to update department." };
  }
}

export async function deleteDepartmentAction(
  departmentId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { success: false, error: "Unauthorized" };

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/departments/${departmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const rawMsg = errData.message || errData.error;
      const errMsg = Array.isArray(rawMsg)
        ? rawMsg.join(", ")
        : typeof rawMsg === "string"
        ? rawMsg
        : `Failed to delete department (${res.status}).`;
      return { success: false, error: errMsg };
    }

    revalidatePath("/departments");
    revalidatePath("/[objectApiName]");
    revalidatePath("/jobs");

    return { success: true };
  } catch (err: any) {
    console.error("[deleteDepartmentAction]", err);
    return { success: false, error: err.message || "Failed to delete department." };
  }
}
