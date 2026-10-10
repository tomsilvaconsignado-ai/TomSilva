import React from 'react';
import { AdItem } from '../../types/database';

interface AdSlotProps {
  ad?: AdItem;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ ad, className = '' }) => {
  if (!ad || !ad.active) return null;

  return (
    <div
      className={`group relative w-full mx-auto transition-all ${className}`}
      style={{ maxWidth: ad.maxWidth ? `${ad.maxWidth}px` : undefined }}
    >
      <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
        Publicidade • {ad.sponsorName}
      </span>
      <a
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block"
        title={`Anúncio: ${ad.title}`}
      >
        <div
          className="w-full overflow-hidden rounded-lg bg-gray-100 border border-gray-200/50 transition-all hover:border-[#0056a4]/40 hover:shadow-md"
          style={{
            aspectRatio: ad.aspectRatio.replace(/\s+/g, ''),
            display: 'block'
          }}
        >
          {ad.mediaType === 'video' ? (
            <video
              src={ad.mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              alt={ad.title}
              loading="lazy"
              src={ad.mediaUrl}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </a>
    </div>
  );
};
