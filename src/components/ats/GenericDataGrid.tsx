"use client";


import React, { useEffect, useState } from "react";
import { usePermissions, ObjectMetadata } from "@/context/PermissionsContext";
import { fetchObjectRecordsAction } from "@/app/actions/data";
import { deleteProfileAPIAction } from "@/app/actions/permissions";
import { deleteUserAction } from "@/app/actions/users";
import { deleteJobAction } from "@/app/actions/jobs";
import CreateJobModal from "@/components/ats/CreateJobModal";
import EditJobModal from "@/components/ats/EditJobModal";


interface GenericDataGridProps {
  objectApiName: string;
  onRowClick?: (id: string, record?: any) => void;
}


export default function GenericDataGrid({ objectApiName, onRowClick }: GenericDataGridProps) {
  const { fetchMetadata } = usePermissions();
  const [metadata, setMetadata] = useState<ObjectMetadata | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [editJobRecord, setEditJobRecord] = useState<any | null>(null);


  const [toastMsg, setToastMsg] = useState<{ title: string; message: string; icon: string } | null>(null);


  function showGridToast(title: string, msg: string, icon = "info") {
    setToastMsg({ title, message: msg, icon });
    setTimeout(() => setToastMsg(null), 3000);
  }


  async function reloadRecords() {
    try {
      const res = await fetchObjectRecordsAction(objectApiName, page, limit, search);
      let data = res.data;
      let tot = res.total;
      if (search && objectApiName === "Job") {
        data = data.filter((r: any) => r.title && r.title.toLowerCase().includes(search.toLowerCase()));
        tot = data.length;
      }
      setRecords(data);
      setTotal(tot);
    } catch { }
  }


  const handleEdit = (recordId: string) => {
    if (objectApiName === "Profile") {
      window.location.href = `/setup/profiles/${recordId}`;
    } else if (objectApiName === "User") {
      window.location.href = `/setup/users/${recordId}`;
    } else if (objectApiName === "Job") {
      const record = records.find((r) => r.id === recordId);
      if (record) setEditJobRecord(record);
    }
  };


  const handleDelete = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      if (objectApiName === "Profile") {
        const res = await deleteProfileAPIAction(recordId);
        if (res.error) throw new Error(res.error);
      } else if (objectApiName === "User") {
        const res = await deleteUserAction(recordId);
        if (res.error) throw new Error(res.error);
      } else if (objectApiName === "Job") {
        const res = await deleteJobAction(recordId);
        if (res.error) throw new Error(res.error);
      }
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      showGridToast("Deleted", "Record has been deleted.", "trash-can");
    } catch (err: any) {
      alert(err.message || "Failed to delete record.");
    }
  };


  // 1. Fetch metadata and records
  useEffect(() => {
    let active = true;


    async function load() {
      setLoading(true);
      setError(null);

      const meta = await fetchMetadata(objectApiName);
      if (!active) return;
      if (!meta) {
        setError(`Failed to fetch metadata for object: ${objectApiName}`);
        setLoading(false);
        return;
      }
      setMetadata(meta);


      if (!meta.ols.allowRead) {
        setError("Access Denied: You do not have Read access for this object.");
        setLoading(false);
        return;
      }


      try {
        const res = await fetchObjectRecordsAction(objectApiName, page, limit, search);
        if (!active) return;
        let data = res.data;
        let total = res.total;
        if (search && objectApiName === "Job") {
          data = data.filter((r: any) => r.title && r.title.toLowerCase().includes(search.toLowerCase()));
          total = data.length;
        }
        setRecords(data);
        setTotal(total);
      } catch (err: any) {
        setError(err.message || "Failed to load records.");
      } finally {
        if (active) setLoading(false);
      }
    }


    load();
    return () => {
      active = false;
    };
  }, [objectApiName, page, limit, search]);


  if (loading && !metadata) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading {objectApiName} records...</p>
      </div>
    );
  }


  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/50">
          <i className="fa-solid fa-triangle-exclamation text-2xl" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Access Restrained</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{error}</p>
      </div>
    );
  }


  if (!metadata) return null;


  // Filter fields visible according to FLS allowRead
  const visibleFields = metadata.fields.filter((f) => f.allowRead);


  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-6 space-y-6">

      {/* Dynamic Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/30">
              {metadata.apiName} Object
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">{metadata.label} Explorer</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Displaying {records.length} records dynamically generated based on OLS/FLS settings.
          </p>
        </div>


        {metadata.ols.allowCreate && (
          <button
            onClick={() => {
              if (objectApiName === "Job") {
                setShowCreateJobModal(true);
              }
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <i className="fa-solid fa-plus text-xs" />
            <span>Create New {metadata.label}</span>
          </button>
        )}
      </div>


      {/* Search & Pagination Limit Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        {objectApiName === "User" || objectApiName === "Job" ? (
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <i className="fa-solid fa-magnifying-glass text-xs" />
            </span>
            <input
              type="text"
              placeholder={objectApiName === "Job" ? "Search jobs by title..." : "Search users by email..."}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-850 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-350"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Show</span>
          <input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(e) => {
              const val = Math.max(1, Number(e.target.value || 1));
              setLimit(val);
              setPage(1);
            }}
            className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center font-bold text-slate-700 dark:text-slate-300"
          />
          <span>records per page</span>
        </div>
      </div>


      {/* Grid Table */}
      <div className={`bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm ${loading ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {visibleFields.map((field) => (
                  <th key={field.apiName} className="px-6 py-4.5 font-semibold">
                    {field.label}
                  </th>
                ))}
                {(metadata.ols.allowEdit || metadata.ols.allowDelete) && (
                  <th className="px-6 py-4.5 text-right font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-850 text-sm text-slate-700 dark:text-slate-350">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={visibleFields.length + 1} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    No records found or populated for this object type.
                  </td>
                </tr>
              ) : (
                records.map((record, index) => (
                  <tr
                    key={record.id || index}
                    onClick={() => onRowClick?.(record.id, record)}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                  >
                    {visibleFields.map((field) => {
                      let val = record[field.apiName];


                      // If field is a foreign-key ID (e.g. ownerId), resolve to the related object's display name
                      if (typeof val === "string" && field.apiName.endsWith("Id")) {
                        const relationKey = field.apiName.replace(/Id$/, "");
                        const related = record[relationKey];
                        if (related && typeof related === "object") {
                          if (related.firstName || related.lastName) {
                            val = `${related.firstName || ""} ${related.lastName || ""}`.trim();
                          } else {
                            val = related.name || related.label || val;
                          }
                        }
                      }


                      // Nested object handles (e.g. j.department.name)
                      if (val && typeof val === "object" && !Array.isArray(val)) {
                        if (val.firstName || val.lastName) {
                          val = `${val.firstName || ""} ${val.lastName || ""}`.trim();
                        } else {
                          val = val.name || val.label || JSON.stringify(val);
                        }
                      }


                      // Formatting Boolean / Array types
                      if (typeof val === "boolean") {
                        val = val ? "Yes" : "No";
                      } else if (Array.isArray(val)) {
                        val = val.join(", ");
                      }


                      const isLink =
                        (objectApiName === "Profile" && field.apiName === "name") ||
                        (objectApiName === "User" && field.apiName === "email") ||
                        (objectApiName === "Job" && field.apiName === "title") ||
                        (objectApiName === "Candidate" && field.apiName === "name");


                      const isProfileLink =
                        objectApiName === "User" && field.apiName === "profile";


                      return (
                        <td key={field.apiName} className="px-6 py-4.5 font-medium text-slate-700 dark:text-slate-350">
                          {isLink ? (
                            onRowClick ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRowClick(record.id, record);
                                }}
                                className="text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold hover:underline text-left focus:outline-none"
                              >
                                {val !== undefined && val !== null ? String(val) : "-"}
                              </button>
                            ) : (
                              <a
                                href={
                                  objectApiName === "Profile"
                                    ? `/setup/profiles/${record.id}`
                                    : `/setup/users/${record.id}`
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold hover:underline"
                              >
                                {val !== undefined && val !== null ? String(val) : "-"}
                              </a>
                            )
                          ) : isProfileLink ? (
                            <a
                              href={`/setup/profiles/${record.profile?.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold hover:underline"
                            >
                              {record.profile?.name || "-"}
                            </a>
                          ) : (
                            val !== undefined && val !== null ? String(val) : "-"
                          )}
                        </td>
                      );
                    })}


                    {/* Actions column based on OLS and record-level sharing access */}
                    {(metadata.ols.allowEdit || metadata.ols.allowDelete) && (
                      <td
                        className="px-6 py-4.5 text-right space-x-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {metadata.ols.allowEdit && record.userRecordAccess?.isEditable !== false && (
                          <button
                            onClick={() => handleEdit(record.id)}
                            className="text-indigo-650 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 text-xs font-bold hover:underline"
                          >
                            Edit
                          </button>
                        )}
                        {metadata.ols.allowDelete && record.userRecordAccess?.isDeletable !== false && (
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="text-rose-605 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 text-xs font-bold hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>


        {/* Pagination Toolbar */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4.5 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-450 font-medium">
            Showing <span className="font-bold text-slate-700 dark:text-slate-200">{total === 0 ? 0 : (page - 1) * limit + 1}</span> to{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(page * limit, total)}</span> of{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span> records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-655 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Previous
            </button>
            <span className="text-slate-400 dark:text-slate-500 px-1 font-semibold">
              Page {page} of {Math.max(1, Math.ceil(total / limit))}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(Math.ceil(total / limit), prev + 1))}
              disabled={page >= Math.ceil(total / limit)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-655 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>


      {showCreateJobModal && (
        <CreateJobModal
          onClose={() => setShowCreateJobModal(false)}
          onSave={(_job, _audit) => {
            reloadRecords();
          }}
          onToast={showGridToast}
        />
      )}


      {editJobRecord && (
        <EditJobModal
          record={editJobRecord}
          onClose={() => setEditJobRecord(null)}
          onSaved={() => {
            setEditJobRecord(null);
            reloadRecords();
          }}
          onToast={showGridToast}
        />
      )}


      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <i className={`fa-solid fa-${toastMsg.icon} text-indigo-600 dark:text-indigo-400`} />
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{toastMsg.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{toastMsg.message}</p>
          </div>
        </div>
      )}


    </div>
  );
}



