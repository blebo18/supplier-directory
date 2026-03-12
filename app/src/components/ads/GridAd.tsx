"use client";

interface GridAdProps {
  ad: {
    id: number;
    imageUrl: string;
    destinationUrl: string;
    name: string;
  };
  onTrackClick: (adId: number) => void;
}

export default function GridAd({ ad, onTrackClick }: GridAdProps) {
  const handleClick = () => {
    onTrackClick(ad.id);
    window.open(ad.destinationUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition text-left group relative overflow-hidden"
    >
      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-medium">
        Sponsored
      </span>
      <img
        src={ad.imageUrl}
        alt={ad.name}
        className="w-full h-32 object-contain mb-3 rounded"
      />
      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition mb-1 truncate">
        {ad.name}
      </h3>
    </button>
  );
}
