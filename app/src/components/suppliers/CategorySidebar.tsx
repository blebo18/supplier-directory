"use client";

import { useState } from "react";

interface CategorySidebarProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategorySidebar({ categories, selected, onSelect }: CategorySidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? categories.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : categories;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-24">
      <h2 className="font-semibold text-gray-900 mb-3">Categories</h2>
      <input
        type="text"
        placeholder="Filter categories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none mb-3 text-gray-900 placeholder-gray-400"
      />
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto space-y-0.5">
        {filtered.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat === selected ? "" : cat)}
            className={`block w-full text-left px-2 py-1.5 text-sm rounded transition ${
              cat === selected
                ? "bg-blue-100 text-blue-800 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
