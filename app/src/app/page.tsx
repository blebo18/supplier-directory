"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Supplier } from "@/lib/types";
import FeaturedSupplierCard from "@/components/suppliers/FeaturedSupplierCard";
import SupplierCard from "@/components/suppliers/SupplierCard";
import SupplierModal from "@/components/suppliers/SupplierModal";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthModal from "@/components/auth/AuthModal";
import { useAds } from "@/components/ads/useAds";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredSuppliers, setFeaturedSuppliers] = useState<Supplier[]>([]);
  const [popularSuppliers, setPopularSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [heroImage, setHeroImage] = useState("/sd-hero.jpg");
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const { user, logout, isAdmin } = useAuth();
  const { ads: leaderboardAds, trackClick: trackLeaderboardClick } = useAds("LEADERBOARD", 5);

  useEffect(() => {
    const fetchAll = async () => {
      const [featuredRes, popularRes, catRes, settingsRes] = await Promise.all([
        fetch("/api/suppliers?featured=true&pageSize=12"),
        fetch("/api/suppliers/popular?limit=6"),
        fetch("/api/suppliers?pageSize=1"),
        fetch("/api/settings"),
      ]);

      const featuredData = await featuredRes.json();
      setFeaturedSuppliers(featuredData.items || []);

      const popularData = await popularRes.json();
      setPopularSuppliers(popularData.items || []);

      const catData = await catRes.json();
      setCategories(catData.categories || []);
      setTotalSuppliers(catData.total || 0);

      const settingsData = await settingsRes.json();
      if (settingsData.heroImage) setHeroImage(settingsData.heroImage);
      if (settingsData.siteLogo) setSiteLogo(settingsData.siteLogo);
    };

    fetchAll();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const handleCategoryClick = (cat: string) => {
    router.push(`/search?category=${encodeURIComponent(cat)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
              {siteLogo && (
                <img src={siteLogo} alt="Logo" className="h-8 w-auto" />
              )}
              <span className="text-2xl font-bold text-gray-900">Supplier Directory</span>
            </Link>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">
                    {user.name}
                    {user.role !== "VIEWER" && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs uppercase">{user.role}</span>
                    )}
                  </span>
                  {isAdmin && (
                    <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800 transition">
                      Admin
                    </Link>
                  )}
                  <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 transition">
                    Sign out
                  </button>
                </>
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

      {/* Hero Section */}
      <section
        className="border-b border-gray-200 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 flex justify-center">
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl px-10 py-10 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Find the Right Supplier
            </h2>
            <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto">
              Browse our comprehensive directory of manufacturing suppliers.<br />Search by name, category, or location.
            </p>
            <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search suppliers..."
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400"
                style={{ color: "#ffffff", fontSize: "20px", fontWeight: 800 }}
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {leaderboardAds.length > 0 && (
        <section className="py-12">
          <div className="flex flex-wrap justify-center gap-8">
            {leaderboardAds.map((ad) => (
              <button
                key={ad.id}
                onClick={() => {
                  trackLeaderboardClick(ad.id);
                  window.open(ad.destinationUrl, "_blank", "noopener,noreferrer");
                }}
                className="w-[250px] h-[250px] rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-gray-300 transition flex items-center justify-center p-4"
              >
                <img
                  src={ad.imageUrl}
                  alt={ad.name}
                  className="max-w-full max-h-full object-contain"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Featured Companies */}
        {featuredSuppliers.length > 0 && (
          <section className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Companies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredSuppliers.map((supplier) => (
                <FeaturedSupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onClick={() => setSelectedSupplier(supplier)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Browse by Category */}
        {categories.length > 0 && (
          <section className="py-12 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(showAllCategories ? categories : categories.slice(0, 12)).map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm transition text-left"
                >
                  {cat}
                </button>
              ))}
            </div>
            {categories.length > 12 && !showAllCategories && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllCategories(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                >
                  Show All ({categories.length} categories)
                </button>
              </div>
            )}
          </section>
        )}

        {/* Popular Suppliers */}
        {popularSuppliers.length > 0 && (
          <section className="py-12 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Most Viewed Suppliers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {popularSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onClick={() => setSelectedSupplier(supplier)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Directory CTA */}
        <section className="py-12 border-t border-gray-200">
          <div className="bg-blue-600 rounded-xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">Explore the Full Directory</h2>
            <p className="text-blue-100 mb-6">
              Browse all {totalSuppliers.toLocaleString()} suppliers with advanced search and filtering.
            </p>
            <Link
              href="/search"
              className="inline-block px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
            >
              View All Suppliers
            </Link>
          </div>
        </section>
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
