"use client";

import { useState, useEffect, useRef } from "react";
import { AdPlacement } from "@/lib/types";

interface ServedAd {
  id: number;
  name: string;
  imageUrl: string;
  destinationUrl: string;
  placement: AdPlacement;
  weight: number;
}

export function useAds(placement: AdPlacement, count: number = 1) {
  const [ads, setAds] = useState<ServedAd[]>([]);
  const trackedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/ads?placement=${placement}&count=${count}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ads) setAds(data.ads);
      })
      .catch(() => {});
  }, [placement, count]);

  useEffect(() => {
    ads.forEach((ad) => {
      if (!trackedRef.current.has(ad.id)) {
        trackedRef.current.add(ad.id);
        fetch(`/api/ads/${ad.id}/impression`, { method: "POST" }).catch(() => {});
      }
    });
  }, [ads]);

  const trackClick = (adId: number) => {
    fetch(`/api/ads/${adId}/click`, { method: "POST" }).catch(() => {});
  };

  return { ads, trackClick };
}
