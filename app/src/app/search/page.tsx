"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Supplier, SearchResult } from "@/lib/types";
import SearchBar from "@/components/suppliers/SearchBar";
import CategorySidebar from "@/components/suppliers/CategorySidebar";
import SupplierGrid from "@/components/suppliers/SupplierGrid";
import SupplierModal from "@/components/suppliers/SupplierModal";
import Pagination from "@/components/suppliers/Pagination";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthModal from "@/components/auth/AuthModal";
import { useAds as useLeaderboardAds } from "@/components/ads/useAds";
import SidebarAd from "@/components/ads/SidebarAd";
import { useAds } from "@/components/ads/useAds";
import Link from "next/link";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "";

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SearchResult | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const { user, logout, isAdmin } = useAuth();

  const { ads: gridAds, trackClick: trackGridClick } = useAds("GRID", 2);
  const { ads: leaderboardAds, trackClick: trackLeaderboardClick } = useLeaderboardAds("LEADERBOARD", 6);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.siteLogo) setSiteLogo(data.siteLogo);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    params.set("page", page.toString());

    const res = await fetch(`/api/suppliers?${params}`);
    const json = await res.json();
    setData(json);
    if (json.categories) {
      setCategories(json.categories);
    }
    setLoading(false);
  }, [debouncedQuery, category, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCategoryClick = (cat: string) => {
    setCategory(cat);
    setPage(1);
    setSelectedSupplier(null);
  };

  const gridAdEntries = gridAds.map((ad, i) => ({
    ad,
    position: i === 0 ? 3 : 9,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-3 shrink-0 hover:opacity-80 transition"
            >
              {siteLogo && (
                <img src={siteLogo} alt="Logo" className="h-8 w-auto" />
              )}
              <span className="text-2xl font-bold text-gray-900">Supplier Directory</span>
            </Link>
            <SearchBar value={query} onChange={setQuery} />
            {category && (
              <button
                onClick={() => { setCategory(""); setPage(1); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition"
              >
                {category}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <div className="sm:ml-auto shrink-0">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {user.name}
                    {user.role !== "VIEWER" && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs uppercase">{user.role}</span>
                    )}
                  </span>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="text-sm text-blue-600 hover:text-blue-800 transition"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <CategorySidebar
            categories={categories}
            selected={category}
            onSelect={(cat) => { setCategory(cat); setPage(1); }}
          />
          <SidebarAd />
        </aside>

        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {loading ? "Searching..." : (
                <><span className="font-medium text-gray-900">{data?.total.toLocaleString()}</span> suppliers found</>
              )}
            </p>
            <div className="lg:hidden">
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {leaderboardAds.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap justify-center gap-6">
                {leaderboardAds.map((ad) => (
                  <button
                    key={ad.id}
                    onClick={() => {
                      trackLeaderboardClick(ad.id);
                      window.open(ad.destinationUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="w-[150px] h-[150px] rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-gray-300 transition flex items-center justify-center p-3"
                  >
                    <img
                      src={ad.imageUrl}
                      alt={ad.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <SupplierGrid
            suppliers={data?.items || []}
            loading={loading}
            onSelect={setSelectedSupplier}
            gridAds={gridAdEntries}
            onAdClick={trackGridClick}
          />

          {data && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </main>
      </div>

      {selectedSupplier && (
        <SupplierModal
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onCategoryClick={handleCategoryClick}
        />
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <SearchContent />
    </Suspense>
  );
}
