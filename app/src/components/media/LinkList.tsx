"use client";

import { SupplierLink } from "@/lib/types";

interface LinkListProps {
  links: SupplierLink[];
}

export default function LinkList({ links }: LinkListProps) {
  if (links.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">External Links</p>
      <div className="space-y-1.5">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition group"
          >
            <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm text-gray-700 group-hover:text-blue-600 truncate flex-1">
              {link.title}
            </span>
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
