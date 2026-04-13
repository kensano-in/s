"use client";

/**
 * MediaVaultModal — All shared media, links and files in one place.
 * Tabs: Photos | Links | Docs
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { X, Image, Link2, FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

interface MediaVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  convId: string;
  isGroup: boolean;
  currentUserId: string;
}

type Tab = "photos" | "links" | "docs";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function extractLinks(content: string): string[] {
  return content.match(URL_REGEX) || [];
}

export default function MediaVaultModal({
  isOpen,
  onClose,
  convId,
  isGroup,
  currentUserId,
}: MediaVaultModalProps) {
  const [tab, setTab] = useState<Tab>("photos");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!convId || !isOpen) return;
    setLoading(true);
    try {
      const { getMediaVaultDB } = await import("@/app/(main)/messages/actions");
      const res = await getMediaVaultDB(currentUserId, convId, isGroup);
      if (res.success && res.data) setItems(res.data);
    } catch (e) {
      console.error("[MediaVault]", e);
    }
    setLoading(false);
  }, [convId, isGroup, currentUserId, isOpen]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const photos = items.filter((m) => m.type === "image" && m.media_url);
  const docs = items.filter((m) => m.type === "file" && m.media_url);
  const links = items
    .filter((m) => m.type === "text" && m.content)
    .flatMap((m) =>
      extractLinks(m.content).map((url) => ({
        url,
        sent_at: m.sent_at,
        sender: m.sender,
      }))
    );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "photos", label: "Photos", icon: <Image size={15} />, count: photos.length },
    { id: "links", label: "Links", icon: <Link2 size={15} />, count: links.length },
    { id: "docs", label: "Docs", icon: <FileText size={15} />, count: docs.length },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            className="fixed inset-x-0 bottom-0 z-[90] flex flex-col md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
            style={{
              background: "rgba(10,10,18,0.97)",
              backdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px 24px 0 0",
              maxHeight: "85dvh",
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 -24px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <h2 className="text-[17px] font-bold text-white tracking-tight">Media & Files</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 pt-4 gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all",
                    tab === t.id
                      ? "bg-primary text-white shadow-lg"
                      : "bg-white/[0.06] text-white/50 hover:text-white/80"
                  )}
                >
                  {t.icon}
                  {t.label}
                  {t.count > 0 && (
                    <span className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                      tab === t.id ? "bg-white/20 text-white" : "bg-white/10 text-white/40"
                    )}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-primary opacity-60" size={28} />
                </div>
              ) : (
                <>
                  {/* Photos tab */}
                  {tab === "photos" && (
                    photos.length === 0 ? (
                      <EmptyVault label="No photos shared yet" />
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {photos.map((m, i) => (
                          <motion.button
                            key={m.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => setLightbox(m.media_url)}
                            className="aspect-square rounded-xl overflow-hidden relative group"
                          >
                            <img
                              src={m.media_url}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                          </motion.button>
                        ))}
                      </div>
                    )
                  )}

                  {/* Links tab */}
                  {tab === "links" && (
                    links.length === 0 ? (
                      <EmptyVault label="No links shared yet" />
                    ) : (
                      <div className="flex flex-col gap-3">
                        {links.map((l, i) => (
                          <motion.a
                            key={i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 p-4 rounded-2xl group hover:bg-white/[0.06] transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                          >
                            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                              <Link2 size={15} className="text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-white/80 truncate">{l.url}</p>
                              <p className="text-[11px] text-white/30 mt-0.5">
                                {l.sent_at ? format(new Date(l.sent_at), "MMM d, yyyy") : ""}
                              </p>
                            </div>
                            <ExternalLink size={14} className="text-white/20 group-hover:text-white/60 transition-colors shrink-0 mt-1.5" />
                          </motion.a>
                        ))}
                      </div>
                    )
                  )}

                  {/* Docs tab */}
                  {tab === "docs" && (
                    docs.length === 0 ? (
                      <EmptyVault label="No files shared yet" />
                    ) : (
                      <div className="flex flex-col gap-3">
                        {docs.map((m, i) => {
                          const ext = (m.file_name?.split(".").pop() || "file").toUpperCase();
                          return (
                            <motion.a
                              key={m.id}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              href={m.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={m.file_name}
                              className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/[0.06] transition-colors"
                              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                                <FileText size={17} className="text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-white/80 truncate font-medium">{m.file_name || "File"}</p>
                                <p className="text-[11px] text-white/30 uppercase tracking-wide mt-0.5">{ext}</p>
                              </div>
                              <Download size={15} className="text-white/30 hover:text-white/70 transition-colors shrink-0" />
                            </motion.a>
                          );
                        })}
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Lightbox */}
          <AnimatePresence>
            {lightbox && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
                onClick={() => setLightbox(null)}
              >
                <motion.img
                  initial={{ scale: 0.85 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.85 }}
                  src={lightbox}
                  alt=""
                  className="max-w-[90vw] max-h-[90dvh] rounded-2xl object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => setLightbox(null)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

function EmptyVault({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-30">
      <FileText size={36} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
