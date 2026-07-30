"use client";

import React, { useState } from "react";

interface Option {
  id: string;
  name: string;
  description?: string;
}

interface DualListBoxProps {
  availableTitle?: string;
  selectedTitle?: string;
  options: Option[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export default function DualListBox({
  availableTitle = "Available",
  selectedTitle = "Selected",
  options,
  selectedIds,
  onChange,
}: DualListBoxProps) {
  const [leftSelected, setLeftSelected] = useState<string[]>([]);
  const [rightSelected, setRightSelected] = useState<string[]>([]);

  // Split options into available vs selected
  const availableOptions = options.filter((o) => !selectedIds.includes(o.id));
  const selectedOptions = options.filter((o) => selectedIds.includes(o.id));

  // Move items from available to selected
  const handleMoveRight = () => {
    if (leftSelected.length === 0) return;
    const newSelected = [...selectedIds, ...leftSelected];
    onChange(newSelected);
    setLeftSelected([]);
  };

  // Move items from selected to available
  const handleMoveLeft = () => {
    if (rightSelected.length === 0) return;
    const newSelected = selectedIds.filter((id) => !rightSelected.includes(id));
    onChange(newSelected);
    setRightSelected([]);
  };

  // Move all items
  const handleMoveAllRight = () => {
    const allIds = options.map((o) => o.id);
    onChange(allIds);
    setLeftSelected([]);
  };

  const handleMoveAllLeft = () => {
    onChange([]);
    setRightSelected([]);
  };

  // Handle single selection toggle
  const toggleLeft = (id: string) => {
    setLeftSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleRight = (id: string) => {
    setRightSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col md:flex-row items-stretch gap-4 w-full">
      
      {/* Available List Box */}
      <div className="flex-1 flex flex-col border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900/50">
        <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {availableTitle} ({availableOptions.length})
        </div>
        <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto p-2 space-y-1">
          {availableOptions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-600">
              No options available
            </div>
          ) : (
            availableOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleLeft(opt.id)}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex flex-col ${
                  leftSelected.includes(opt.id)
                    ? "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-850 text-indigo-700 dark:text-indigo-300"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="font-semibold">{opt.name}</span>
                {opt.description && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate w-full">
                    {opt.description}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex md:flex-col items-center justify-center gap-2 px-2">
        <button
          type="button"
          onClick={handleMoveRight}
          disabled={leftSelected.length === 0}
          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-600 dark:text-slate-400 shadow-sm"
          title="Move Selected Right"
        >
          <i className="fa-solid fa-chevron-right hidden md:inline" />
          <i className="fa-solid fa-chevron-down md:hidden" />
        </button>
        <button
          type="button"
          onClick={handleMoveLeft}
          disabled={rightSelected.length === 0}
          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-600 dark:text-slate-400 shadow-sm"
          title="Move Selected Left"
        >
          <i className="fa-solid fa-chevron-left hidden md:inline" />
          <i className="fa-solid fa-chevron-up md:hidden" />
        </button>
        <button
          type="button"
          onClick={handleMoveAllRight}
          disabled={availableOptions.length === 0}
          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-600 dark:text-slate-400 shadow-sm"
          title="Move All Right"
        >
          <i className="fa-solid fa-angles-right hidden md:inline" />
          <i className="fa-solid fa-angles-down md:hidden" />
        </button>
        <button
          type="button"
          onClick={handleMoveAllLeft}
          disabled={selectedOptions.length === 0}
          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-600 dark:text-slate-400 shadow-sm"
          title="Move All Left"
        >
          <i className="fa-solid fa-angles-left hidden md:inline" />
          <i className="fa-solid fa-angles-up md:hidden" />
        </button>
      </div>

      {/* Selected List Box */}
      <div className="flex-1 flex flex-col border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900/50">
        <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {selectedTitle} ({selectedOptions.length})
        </div>
        <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto p-2 space-y-1">
          {selectedOptions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-600">
              No options selected
            </div>
          ) : (
            selectedOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleRight(opt.id)}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex flex-col ${
                  rightSelected.includes(opt.id)
                    ? "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-850 text-indigo-700 dark:text-indigo-300"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="font-semibold">{opt.name}</span>
                {opt.description && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate w-full">
                    {opt.description}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
