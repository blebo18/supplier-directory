"use client";

import { useAds } from "./useAds";

export default function SidebarAd() {
  const { ads, trackClick } = useAds("SIDEBAR", 1);

  if (ads.length === 0) return null;

  const ad = ads[0];

  const handleClick = () => {
    trackClick(ad.id);
    window.open(ad.destinationUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
      <button onClick={handleClick} className="block w-full text-left group">
        <span className="text-xs text-gray-400 font-medium">Sponsored</span>
        <img
          src={ad.imageUrl}
          alt={ad.name}
          className="w-full h-auto object-contain mt-2 rounded"
        />
        <p className="text-sm text-gray-900 group-hover:text-blue-600 transition mt-2 truncate">
          {ad.name}
        </p>
      </button>
    </div>
  );
}
