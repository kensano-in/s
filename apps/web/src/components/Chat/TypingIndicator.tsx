"use client";

import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="flex items-center gap-2 px-5 py-3 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-[22px] rounded-bl-[6px] w-fit shadow-2xl ml-4 mb-4 select-none"
    >
      <div className="flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/80 shadow-[0_0_10px_rgba(98,0,238,0.4)]"
            animate={{ 
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.1, 0.8]
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-2">Typing</span>
    </motion.div>
  );
}
