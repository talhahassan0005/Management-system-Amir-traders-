"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export interface BasicProduct {
  _id: string;
  item: string; // item code
  description?: string;
  brand?: string;
}

interface Props {
  value?: string; // productId
  onSelect: (product: BasicProduct) => void;
  options: BasicProduct[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function ProductTypeahead({
  value,
  onSelect,
  options,
  placeholder = "Type to search product...",
  disabled = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Find current selection label when value changes
  const selected = useMemo(() => options.find((o) => o._id === value) || null, [options, value]);

  useEffect(() => {
    if (selected) setQuery(selected.item);
  }, [selected]);

  // Filter options by item, description, or brand (case-insensitive)
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return options.slice(0, 20);
    return options
      .filter((o) =>
        (o.item || "").toLowerCase().includes(q) ||
        (o.description || "").toLowerCase().includes(q) ||
        (o.brand || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [options, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[highlight];
      if (pick) {
        setQuery(pick.item);
        setOpen(false);
        onSelect(pick);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm ${disabled ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300" : "bg-white"}`}
      />

      {open && !disabled && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">No results</li>
          ) : (
            filtered.map((o, idx) => (
              <li
                key={o._id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery(o.item);
                  setOpen(false);
                  onSelect(o);
                }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${idx === highlight ? "bg-blue-50" : ""}`}
              >
                <div className="font-medium text-gray-900">{o.item}</div>
                {(o.description || o.brand) && (
                  <div className="text-xs text-gray-500">{[o.brand, o.description].filter(Boolean).join(" • ")}</div>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
