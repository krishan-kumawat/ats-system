"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchOwdAction, updateOwdAction } from "@/app/actions/sharing";

interface OwdSetting {
  schemaObjectId: string;
  apiName: string;
  label: string;
  defaultAccessLevel: "PRIVATE" | "READ_ONLY" | "READ_WRITE";
  grantAccessUsingHierarchies: boolean;
}

interface OwdSettingsPanelProps {
  onToast: (title: string, msg: string, icon?: string) => void;
}

export default function OwdSettingsPanel({ onToast }: OwdSettingsPanelProps) {
  const [owds, setOwds] = useState<OwdSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadOwds = useCallback(async () => {
    setLoading(true);
    const res = await fetchOwdAction();
    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }
    if (res.error) {
      onToast("Error", res.error, "ban");
    } else if (res.owds) {
      setOwds(res.owds);
    }
    setLoading(false);
  }, [onToast]);

  useEffect(() => {
    loadOwds();
  }, [loadOwds]);

  const handleUpdateOwd = async (
    schemaObjectId: string,
    field: "defaultAccessLevel" | "grantAccessUsingHierarchies",
    val: any
  ) => {
    setSavingId(schemaObjectId);
    const current = owds.find((o) => o.schemaObjectId === schemaObjectId);
    if (!current) return;

    const dto = {
      schemaObjectId,
      defaultAccessLevel: field === "defaultAccessLevel" ? val : current.defaultAccessLevel,
      grantAccessUsingHierarchies:
        field === "grantAccessUsingHierarchies" ? val : current.grantAccessUsingHierarchies,
    };

    const res = await updateOwdAction(dto);
    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }

    if (res.error) {
      onToast("Update Failed", res.error, "triangle-exclamation");
    } else {
      onToast(
        "OWD Saved",
        `Sharing defaults updated successfully for ${current.label}. Recalculation triggered.`,
        "check"
      );
      // Update local state
      setOwds((prev) =>
        prev.map((o) =>
          o.schemaObjectId === schemaObjectId
            ? {
                ...o,
                defaultAccessLevel: dto.defaultAccessLevel,
                grantAccessUsingHierarchies: dto.grantAccessUsingHierarchies,
              }
            : o
        )
      );
    }
    setSavingId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs text-slate-400">Loading Org-Wide Sharing Defaults...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl flex items-start gap-3">
        <i className="fa-solid fa-circle-info text-indigo-600 dark:text-indigo-400 mt-0.5 text-sm" />
        <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong className="text-slate-800 dark:text-slate-200">Organization-Wide Defaults (OWD)</strong> sets the baseline default access levels for candidates, jobs, and department records. 
          If a user does not own a record, their access is gated by the defaults defined here, plus permissions defined in their security profiles.
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
              <th className="px-5 py-3 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Object Label</th>
              <th className="px-5 py-3 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">API Name</th>
              <th className="px-5 py-3 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-[30%]">Default Access</th>
              <th className="px-5 py-3 text-center font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-[20%]">Grant Access Using Hierarchies</th>
              <th className="px-5 py-3 text-center font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-[10%]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {owds.map((o) => (
              <tr key={o.schemaObjectId} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                  {o.label}
                </td>
                <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-mono">
                  {o.apiName}
                </td>
                <td className="px-5 py-4">
                  <select
                    value={o.defaultAccessLevel}
                    disabled={savingId === o.schemaObjectId}
                    onChange={(e) =>
                      handleUpdateOwd(
                        o.schemaObjectId,
                        "defaultAccessLevel",
                        e.target.value as any
                      )
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-all font-semibold"
                  >
                    <option value="PRIVATE">Private</option>
                    <option value="READ_ONLY">Public Read-Only</option>
                    <option value="READ_WRITE">Public Read/Write</option>
                  </select>
                </td>
                <td className="px-5 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={o.grantAccessUsingHierarchies}
                    disabled={savingId === o.schemaObjectId}
                    onChange={(e) =>
                      handleUpdateOwd(
                        o.schemaObjectId,
                        "grantAccessUsingHierarchies",
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-950 dark:border-slate-700 disabled:opacity-50"
                  />
                </td>
                <td className="px-5 py-4 text-center">
                  {savingId === o.schemaObjectId ? (
                    <i className="fa-solid fa-spinner fa-spin text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1">
                      <i className="fa-solid fa-circle-check" /> Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
