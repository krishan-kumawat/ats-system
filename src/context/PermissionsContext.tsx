"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface NavigationTab {
  apiName: string;
  label: string;
  iconName: string;
  tabType: "OBJECT" | "DASHBOARD" | "CUSTOM";
  route: string;
  sortOrder: number;
}

export interface ObjectMetadata {
  apiName: string;
  label: string;
  ols: {
    allowCreate: boolean;
    allowRead: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
  };
  fields: Array<{
    apiName: string;
    label: string;
    allowRead: boolean;
    allowEdit: boolean;
  }>;
}

interface PermissionsContextType {
  navigationTabs: NavigationTab[];
  metadataMap: Record<string, ObjectMetadata>;
  loading: boolean;
  error: string | null;
  fetchMetadata: (objectApiName: string) => Promise<ObjectMetadata | null>;
  refreshNavigation: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [navigationTabs, setNavigationTabs] = useState<NavigationTab[]>([]);
  const [metadataMap, setMetadataMap] = useState<Record<string, ObjectMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshNavigation = async () => {
    if (typeof window !== "undefined" && window.location.pathname === "/login") {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/v1/navigation/tabs");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(`Failed to load navigation: ${res.statusText}`);
      }
      const data = await res.json();
      setNavigationTabs(data);
      setError(null);
    } catch (err: any) {
      console.error("[PermissionsContext] Load error:", err);
      setError(err.message || "Failed to load dynamic navigation tabs.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async (objectApiName: string): Promise<ObjectMetadata | null> => {
    if (metadataMap[objectApiName]) {
      return metadataMap[objectApiName];
    }

    try {
      const res = await fetch(`/api/v1/metadata/${objectApiName}`);
      if (!res.ok) {
        throw new Error(`Failed to load metadata for ${objectApiName}`);
      }
      const data = await res.json();
      setMetadataMap((prev) => ({
        ...prev,
        [objectApiName]: data,
      }));
      return data;
    } catch (err) {
      console.error(`[PermissionsContext] Metadata fetch error for ${objectApiName}:`, err);
      return null;
    }
  };

  useEffect(() => {
    refreshNavigation();
  }, []);

  return (
    <PermissionsContext.Provider
      value={{
        navigationTabs,
        metadataMap,
        loading,
        error,
        fetchMetadata,
        refreshNavigation,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}
