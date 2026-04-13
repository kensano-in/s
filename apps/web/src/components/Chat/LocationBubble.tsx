"use client";

/**
 * LocationBubble — Live & Static Location Message Display
 * Uses OpenStreetMap static tile for zero-cost map rendering
 */

import { motion } from "framer-motion";
import { MapPin, Navigation, ExternalLink, Clock } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface LocationBubbleProps {
  lat: number;
  lng: number;
  address?: string;
  isLive?: boolean;
  expiresAt?: string;
  isMine: boolean;
  sentAt: string;
}

function getStaticMapUrl(lat: number, lng: number, zoom = 14, width = 280, height = 160): string {
  // OpenStreetMap static map via staticmap.net (free, no key needed)
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&markers=${lat},${lng},red`;
}

function getMapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export default function LocationBubble({
  lat,
  lng,
  address,
  isLive,
  expiresAt,
  isMine,
  sentAt,
}: LocationBubbleProps) {
  const [imgError, setImgError] = useState(false);

  const isExpired = expiresAt ? new Date() > new Date(expiresAt) : false;
  const isActiveLive = isLive && !isExpired;

  const expiryLabel = expiresAt && !isExpired
    ? `Live until ${formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}`
    : null;

  const mapUrl = getStaticMapUrl(lat, lng);
  const mapsLink = getMapsUrl(lat, lng);

  return (
    <motion.a
      href={mapsLink}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="block rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        width: 260,
        border: isActiveLive
          ? "1.5px solid rgba(0,255,128,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isActiveLive
          ? "0 0 24px rgba(0,255,128,0.15)"
          : "0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Map image */}
      <div className="relative overflow-hidden" style={{ height: 150 }}>
        {!imgError ? (
          <img
            src={mapUrl}
            alt="Location"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          // Fallback: custom-drawn map placeholder
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(10,20,40,0.9), rgba(20,30,50,0.9))",
            }}
          >
            <div className="flex flex-col items-center gap-2 opacity-50">
              <MapPin size={32} />
              <span className="text-[11px]">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* Live indicator */}
        {isActiveLive && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(0,255,128,0.4)",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-green-400"
            />
            <span className="text-[11px] font-semibold text-green-400">LIVE</span>
          </div>
        )}

        {/* External link hint */}
        <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        >
          <ExternalLink size={12} className="text-white" />
        </div>

        {/* Pin marker */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <MapPin size={28} className="text-red-500 drop-shadow-lg" fill="rgba(220,38,38,0.8)" />
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div
        className="px-3 py-2.5 flex items-center gap-2"
        style={{
          background: isMine ? "rgba(98,0,238,0.2)" : "rgba(255,255,255,0.04)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-white/90 truncate">
            {address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
          </p>
          {expiryLabel && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={9} className="text-green-400/70" />
              <p className="text-[10px] text-green-400/70">{expiryLabel}</p>
            </div>
          )}
          {isExpired && isLive && (
            <p className="text-[10px] text-white/30 mt-0.5">Location sharing ended</p>
          )}
        </div>
        <Navigation size={14} className="text-white/40 shrink-0" />
      </div>
    </motion.a>
  );
}
