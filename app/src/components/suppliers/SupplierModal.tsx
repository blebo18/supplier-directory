"use client";

import { useState, useEffect } from "react";
import { Supplier, SupplierImage, SupplierVideo, SupplierDocument, SupplierLink } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import ContactForm from "@/components/contact/ContactForm";
import SupplierEditForm from "./SupplierEditForm";
import ImageGallery from "@/components/media/ImageGallery";
import ImageUploader from "@/components/media/ImageUploader";
import VideoPlayer from "@/components/media/VideoPlayer";
import VideoManager from "@/components/media/VideoManager";
import DocumentList from "@/components/media/DocumentList";
import DocumentUploader from "@/components/media/DocumentUploader";
import LinkList from "@/components/media/LinkList";
import LinkManager from "@/components/media/LinkManager";

interface SupplierModalProps {
  supplier: Supplier;
  onClose: () => void;
  onCategoryClick: (category: string) => void;
  onUpdate?: (updated: Supplier) => void;
}

export default function SupplierModal({ supplier, onClose, onCategoryClick, onUpdate }: SupplierModalProps) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(supplier);
  const [images, setImages] = useState<SupplierImage[]>([]);
  const [videos, setVideos] = useState<SupplierVideo[]>([]);
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [links, setLinks] = useState<SupplierLink[]>([]);
  const { isEditor } = useAuth();

  // Fetch full details including media + track view
  useEffect(() => {
    fetch(`/api/suppliers/${supplier.id}`)
      .then((res) => res.json())
      .then((data) => {
        setCurrent(data);
        setImages(data.images || []);
        setVideos(data.videos || []);
        setDocuments(data.documents || []);
        setLinks(data.links || []);
      });

    // Track view
    fetch(`/api/suppliers/${supplier.id}/view`, { method: "POST" }).catch(() => {});
  }, [supplier.id]);

  const handleWebsiteClick = (url: string) => {
    fetch(`/api/suppliers/${supplier.id}/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => {});
  };

  const handleSave = (updated: Supplier) => {
    setCurrent(updated);
    setEditing(false);
    onUpdate?.(updated);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={`https://d2p-eticket-logos.sfo3.cdn.digitaloceanspaces.com/${current.id}.jpg`}
              alt={`${current.company} logo`}
              className="w-16 h-16 object-contain rounded-lg border border-gray-200 bg-white shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <h2 className="text-xl font-bold text-gray-900 min-w-0">
              {current.company}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {isEditor && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 transition"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {editing ? (
          <>
            <SupplierEditForm
              supplier={current}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
              <ImageUploader
                supplierId={current.id}
                images={images}
                onImagesChange={setImages}
              />
              <VideoManager
                supplierId={current.id}
                videos={videos}
                onVideosChange={setVideos}
              />
              <DocumentUploader
                supplierId={current.id}
                documents={documents}
                onDocumentsChange={setDocuments}
              />
              <LinkManager
                supplierId={current.id}
                links={links}
                onLinksChange={setLinks}
              />
            </div>
          </>
        ) : (
          <>
            {/* Description */}
            {current.description && (
              <p className="text-gray-700 mb-4">{current.description}</p>
            )}

            {/* Image Gallery */}
            <ImageGallery images={images} />

            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {current.website && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Website</p>
                  <a
                    href={current.website.startsWith("http") ? current.website : `https://${current.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                    onClick={() => handleWebsiteClick(current.website!)}
                  >
                    {current.website}
                  </a>
                </div>
              )}
              {current.phone && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Phone</p>
                  <p className="text-sm text-gray-900">{current.phone}</p>
                </div>
              )}
              {(current.city || current.state) && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Location</p>
                  <p className="text-sm text-gray-900">
                    {[current.street, current.city, current.state].filter(Boolean).join(", ")}{" "}
                    {current.zip}
                  </p>
                </div>
              )}
              {current.employees && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Employees</p>
                  <p className="text-sm text-gray-900">{current.employees.toLocaleString()}</p>
                </div>
              )}
              {current.squareFeet && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Facility Size</p>
                  <p className="text-sm text-gray-900">{current.squareFeet} sq ft</p>
                </div>
              )}
            </div>

            {/* Videos */}
            {videos.length > 0 && <VideoPlayer videos={videos} />}

            {/* Documents */}
            {documents.length > 0 && <DocumentList supplierId={current.id} documents={documents} />}

            {/* External Links */}
            {links.length > 0 && <LinkList links={links} />}

            {/* Categories */}
            {current.categories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {current.categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => onCategoryClick(cat)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Form */}
            <ContactForm supplierId={current.id} />
          </>
        )}
      </div>
    </div>
  );
}
