"use client";

import { useAds } from "./useAds";

export default function LeaderboardAd() {
  const { ads, trackClick } = useAds("LEADERBOARD", 1);

  if (ads.length === 0) return null;

  const ad = ads[0];

  const handleClick = () => {
    trackClick(ad.id);
    window.open(ad.destinationUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mb-4">
      <button
        onClick={handleClick}
        className="w-full bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-gray-300 transition group overflow-hidden"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium shrink-0">Sponsored</span>
          <img
            src={ad.imageUrl}
            alt={ad.name}
            className="max-h-20 w-auto object-contain rounded"
          />
          <span className="text-sm text-gray-900 group-hover:text-blue-600 transition truncate">
            {ad.name}
          </span>
        </div>
      </button>
    </div>
  );
}
