"use client";

import { useState } from "react";
import { SupplierLink } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";

interface LinkManagerProps {
  supplierId: number;
  links: SupplierLink[];
  onLinksChange: (links: SupplierLink[]) => void;
}

export default function LinkManager({ supplierId, links, onLinksChange }: LinkManagerProps) {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setAdding(true);
    setError("");

    try {
      const res = await fetch(`/api/suppliers/${supplierId}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim(), url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add link");
        return;
      }

      const link = await res.json();
      onLinksChange([...links, link]);
      setTitle("");
      setUrl("");
    } catch {
      setError("Failed to add link");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (linkId: number) => {
    setDeleting(linkId);

    try {
      const res = await fetch(`/api/suppliers/${supplierId}/links`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ linkId }),
      });

      if (res.ok) {
        onLinksChange(links.filter((l) => l.id !== linkId));
      }
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">External Links</p>

      {links.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
            >
              <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{link.title}</p>
                <p className="text-xs text-gray-500 truncate">{link.url}</p>
              </div>
              <button
                onClick={() => handleDelete(link.id)}
                disabled={deleting === link.id}
                className="p-1 text-gray-400 hover:text-red-500 transition shrink-0 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Link title"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 placeholder-gray-400"
        />
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={adding || !title.trim() || !url.trim()}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shrink-0 disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add Link"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </div>
  );
}
