"use client";

import { useEffect, useRef } from "react";

export interface ToastState {
  title: string;
  message: string;
  icon: string;
  visible: boolean;
}

interface ToastProps {
  toast: ToastState;
}

export default function Toast({ toast }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [toast]);

  return (
    <div
      className={`absolute top-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl px-4 py-3 rounded-xl z-50 flex items-center gap-3 max-w-sm transition-all duration-300 transform ${
        toast.visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-28 opacity-0 pointer-events-none"
      }`}
    >
      <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs flex-shrink-0">
        <i className={`fa-solid fa-${toast.icon}`} />
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{toast.title}</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{toast.message}</p>
      </div>
    </div>
  );
}
