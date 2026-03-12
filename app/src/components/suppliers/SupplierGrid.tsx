"use client";

import { Supplier } from "@/lib/types";
import SupplierCard from "./SupplierCard";
import GridAd from "@/components/ads/GridAd";

interface GridAdEntry {
  ad: {
    id: number;
    imageUrl: string;
    destinationUrl: string;
    name: string;
  };
  position: number;
}

interface SupplierGridProps {
  suppliers: Supplier[];
  loading: boolean;
  onSelect: (supplier: Supplier) => void;
  gridAds?: GridAdEntry[];
  onAdClick?: (adId: number) => void;
}

export default function SupplierGrid({ suppliers, loading, onSelect, gridAds, onAdClick }: SupplierGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">No suppliers found</p>
        <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
      </div>
    );
  }

  // Build interleaved list of suppliers and ads
  const items: React.ReactNode[] = [];
  const adsByPosition = new Map<number, GridAdEntry>();
  gridAds?.forEach((ga) => adsByPosition.set(ga.position, ga));

  let supplierIndex = 0;
  let position = 0;

  while (supplierIndex < suppliers.length) {
    const adEntry = adsByPosition.get(position);
    if (adEntry) {
      items.push(
        <GridAd
          key={`ad-${adEntry.ad.id}`}
          ad={adEntry.ad}
          onTrackClick={onAdClick || (() => {})}
        />
      );
    } else {
      const supplier = suppliers[supplierIndex];
      items.push(
        <SupplierCard
          key={supplier.id}
          supplier={supplier}
          onClick={() => onSelect(supplier)}
        />
      );
      supplierIndex++;
    }
    position++;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items}
    </div>
  );
}
