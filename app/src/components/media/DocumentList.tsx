"use client";

import { SupplierDocument } from "@/lib/types";

interface DocumentListProps {
  supplierId: number;
  documents: SupplierDocument[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({ supplierId, documents }: DocumentListProps) {
  if (documents.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Documents</p>
      <div className="space-y-1.5">
        {documents.map((doc) => (
          <a
            key={doc.id}
            href={`/api/suppliers/${supplierId}/documents/${doc.id}/download`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition group"
          >
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
            </svg>
            <span className="text-sm text-gray-700 group-hover:text-blue-600 truncate flex-1">
              {doc.title || doc.filename}
            </span>
            <span className="text-xs text-gray-400 shrink-0">
              {formatFileSize(doc.fileSize)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
