"use client";

/**
 * LocationBubble — Live & Static Location Message Display
 *
 * Map: Leaflet.js (dynamically imported) with OSM tiles — guaranteed to render.
 * UX: Reverse geocodes to show "Near Baranagar, West Bengal" instead of meaningless text.
 * Privacy: nearby = fuzzed coords + area name | exact = full address + Google Maps link
 * Expiry: Real-time 1-second countdown, tombstone on expiry.
 */

import { motion } from "framer-motion";
import { MapPin, Navigation, Clock, MapPinOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ── Reverse geocode via Nominatim ────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const a = data.address || {};
    const place =
      a.suburb || a.neighbourhood || a.quarter ||
      a.town || a.village || a.city_district || a.city || a.county || "";
    const state = a.state || "";
    return [place, state].filter(Boolean).join(", ");
  } catch { return ""; }
}

// ── countdown ─────────────────────────────────────────────────────────────────
function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${sec}s left`;
  return `${sec}s left`;
}

// ── LeafletMap component ──────────────────────────────────────────────────────
const MAP_W = 230;
const MAP_H = 120;

function LeafletMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: any = null;

    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // Fix Leaflet default icon paths (broken in webpack/Next.js)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    }).catch((err) => {
      console.error("[LeafletMap] Failed to load Leaflet:", err);
    });


    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // Only run once per component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan to new coordinates if lat/lng changes without remounting
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 14, { animate: false });
    }
  }, [lat, lng]);

  return (
    <div style={{ position: "relative", width: MAP_W, height: MAP_H }}>
      {/* Leaflet needs leaflet.css loaded */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        precedence="default"
      />


      <div ref={containerRef} style={{ width: MAP_W, height: MAP_H }} />

      {/* Gradient overlay — blends map into dark info bar */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 40%, rgba(0,0,0,0.45) 100%)",
      }} />

      {/* Centered red pin — always over the exact coordinate */}
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center", pointerEvents: "none",
      }}>
        <div style={{ transform: "translateY(-50%)", filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.75))" }}>
          <MapPin size={32} color="#ef4444" fill="rgba(239,68,68,0.9)" />
        </div>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface LocationBubbleProps {
  lat: number;
  lng: number;
  address?: string | null;
  isLive?: boolean;
  expiresAt?: string | null;
  isMine: boolean;
  sentAt: string;
  isExact?: boolean;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LocationBubble({
  lat, lng, address, isLive, expiresAt, isMine, isExact = true,
}: LocationBubbleProps) {
  const [now, setNow] = useState<number>(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [placeName, setPlaceName] = useState<string>("");

  // Expiry ticker
  useEffect(() => {
    if (!isLive || !expiresAt) return;
    const expireMs = new Date(expiresAt).getTime();
    if (Date.now() >= expireMs) { setNow(Date.now()); return; }
    intervalRef.current = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= expireMs && intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isLive, expiresAt]);

  // Reverse geocode for area name
  useEffect(() => {
    if (isExact && address) { setPlaceName(address); return; }
    if (!lat || !lng) return;
    let cancelled = false;
    reverseGeocode(lat, lng)
      .then((n) => { if (!cancelled) setPlaceName(n); })
      .catch((err) => { console.error("[LocationBubble] reverse geocode failed:", err); });
    return () => { cancelled = true; };
  }, [lat, lng, isExact, address]);

  const expireMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const msLeft = expireMs ? expireMs - now : null;
  const isExpired = expireMs !== null ? now >= expireMs : false;
  const isActiveLive = isLive && !isExpired;
  const countdownLabel = isActiveLive && msLeft !== null ? formatCountdown(msLeft) : null;

  const displayName = isExact
    ? (address || placeName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    : (placeName ? `Near ${placeName}` : "Locating area…");

  // ── Expired tombstone ──────────────────────────────────────────────────────
  if (isLive && isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="rounded-2xl overflow-hidden"
        style={{ width: MAP_W, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="flex items-center justify-center" style={{ height: MAP_H, background: "rgba(10,10,20,0.9)" }}>
          <div className="flex flex-col items-center gap-2 opacity-25">
            <MapPinOff size={30} className="text-white" />
            <span className="text-[11px] text-white">Location sharing ended</span>
          </div>
        </div>
        <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white/30">Live Location</p>
            <p className="text-[10px] text-white/20 mt-0.5">Expired — ask them to share again</p>
          </div>
          <MapPinOff size={13} className="text-white/20 shrink-0" />
        </div>
      </motion.div>
    );
  }

  // ── Active / static ────────────────────────────────────────────────────────
  const mapsLink = isExact ? `https://maps.google.com/?q=${lat},${lng}` : null;
  const Wrapper = mapsLink ? motion.a : motion.div;
  const wrapperProps = mapsLink ? { href: mapsLink, target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`block rounded-2xl overflow-hidden ${mapsLink ? "cursor-pointer" : ""}`}
      style={{
        width: MAP_W,
        border: isActiveLive ? "1.5px solid rgba(34,197,94,0.4)"
          : isExact ? "1.5px solid rgba(239,68,68,0.4)"
          : "1px solid rgba(255,255,255,0.1)",
        boxShadow: isActiveLive ? "0 0 20px rgba(34,197,94,0.12)"
          : isExact ? "0 0 16px rgba(239,68,68,0.1)"
          : "0 4px 20px rgba(0,0,0,0.35)",
      }}
    >
      {/* Map */}
      <div style={{ position: "relative" }}>
        <LeafletMap lat={lat} lng={lng} />

        {/* LIVE badge */}
        {isActiveLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full z-[1000]"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(34,197,94,0.45)" }}>
            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[11px] font-bold text-green-400">LIVE</span>
          </div>
        )}

        {/* EXACT badge */}
        {isExact && !isActiveLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full z-[1000]"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(239,68,68,0.5)" }}>
            <span className="text-[11px] font-bold text-rose-400">📍 EXACT</span>
          </div>
        )}

        {/* Countdown badge */}
        {countdownLabel && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full z-[1000]"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}>
            <Clock size={9} className="text-green-400/80" />
            <span className="text-[10px] font-semibold text-green-400 tabular-nums">{countdownLabel}</span>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="px-3 py-2.5 flex items-center gap-2" style={{
        background: isExact ? "rgba(239,68,68,0.1)"
          : isMine ? "rgba(98,0,238,0.18)"
          : "rgba(255,255,255,0.04)",
      }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-white/90 truncate">{displayName}</p>
            {isExact && (
              <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/25">
                EXACT
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: isExact ? "rgba(252,165,165,0.55)" : "rgba(255,255,255,0.28)" }}>
            {isExact
              ? (mapsLink ? "Tap to open in Google Maps →" : "Precise GPS location")
              : isActiveLive ? "🔒 Nearby · approximate area"
              : "🔒 Approximate area only"}
          </p>
        </div>
        <Navigation size={13} className={isExact ? "text-rose-400/50 shrink-0" : "text-white/35 shrink-0"} />
      </div>
    </Wrapper>
  );
}
