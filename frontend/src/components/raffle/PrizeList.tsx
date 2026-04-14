"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import type { Prize } from "@/types";

interface PrizeListProps {
  prizes: Prize[];
}

const MEDAL = ["", "\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];

export function PrizeList({ prizes }: PrizeListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sorted = [...prizes].sort((a, b) => a.position - b.position);

  return (
    <section className="space-y-3 px-5">
      <h2 className="text-base font-bold text-gray-900">Prêmios</h2>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {sorted.map((prize) => {
          const isMain = prize.position === 1;
          const medal = MEDAL[prize.position] ?? "";
          const displayNumber =
            prize.position === 1 ? null : (prize.winnerNumber ?? prize.predestinedNumber ?? null);

          return (
            <motion.div
              key={prize.id}
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`flex-shrink-0 snap-center rounded-2xl p-4 space-y-1.5 cursor-default ${
                isMain
                  ? "w-60 bg-green-50 border-2 border-green-200"
                  : "w-44 card"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {medal && <span className="text-lg">{medal}</span>}
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isMain ? "text-green-700" : "text-gray-400"
                  }`}
                >
                  {prize.position}º Prêmio
                </span>
              </div>
              <p
                className={`font-bold leading-snug ${
                  isMain ? "text-base text-gray-900" : "text-sm text-gray-700"
                }`}
              >
                {prize.name}
              </p>
              {displayNumber !== null && (
                <p className="text-[11px] text-green-600 font-mono font-semibold">
                  Nº {String(displayNumber).padStart(6, "0")}
                </p>
              )}
              {prize.description && (
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {prize.description}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
