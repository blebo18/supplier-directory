"use client";

import { useState, useRef } from "react";
import { SupplierDocument } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";

interface DocumentUploaderProps {
  supplierId: number;
  documents: SupplierDocument[];
  onDocumentsChange: (documents: SupplierDocument[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUploader({ supplierId, documents, onDocumentsChange }: DocumentUploaderProps) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (title.trim()) formData.append("title", title.trim());

      const res = await fetch(`/api/suppliers/${supplierId}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        try {
          const data = await res.json();
          setError(data.error || "Upload failed");
        } catch {
          setError(`Upload failed (${res.status})`);
        }
        return;
      }

      const doc = await res.json();
      onDocumentsChange([...documents, doc]);
      setTitle("");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (docId: number) => {
    const res = await fetch(`/api/suppliers/${supplierId}/documents/${docId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      onDocumentsChange(documents.filter((d) => d.id !== docId));
    }
  };

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Documents (PDF only)</p>

      {error && (
        <div className="mb-2 px-3 py-1.5 bg-red-50 text-red-700 rounded text-sm">{error}</div>
      )}

      {documents.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
              </svg>
              <span className="truncate flex-1 text-gray-700">{doc.title || doc.filename}</span>
              <span className="text-xs text-gray-400">{formatFileSize(doc.fileSize)}</span>
              <button
                onClick={() => handleDelete(doc.id)}
                className="shrink-0 text-red-500 hover:text-red-700 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Document title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 placeholder-gray-400"
        />
        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            disabled={uploading}
          />
          {uploading ? "Uploading..." : "Upload PDF"}
        </label>
      </div>
    </div>
  );
}
