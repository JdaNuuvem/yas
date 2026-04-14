"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

interface MilestoneProgressProps {
  raffleId: string;
  prizes: { position: number; name: string }[];
}

export function MilestoneProgress({ raffleId, prizes }: MilestoneProgressProps) {
  const { data } = useQuery({
    queryKey: ["progress", raffleId],
    queryFn: () => api.getProgress(raffleId),
    refetchInterval: 30_000,
  });

  if (!data) return null;

  const { percentage, milestonesReached } = data;
  const pct = Math.min(percentage, 100);
  const sorted = [...prizes].sort((a, b) => b.position - a.position);

  return (
    <section className="px-5 space-y-4">
      <div className="card p-5 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-gray-900">
            Progresso dos Premios
          </h2>
          <p className="text-sm text-gray-500">
            A cada 10% vendido, um novo premio e liberado!
          </p>
        </div>

        {/* Percentage display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center"
        >
          <span className="text-4xl font-black text-green-600">
            {pct.toFixed(1)}%
          </span>
          <span className="text-sm text-gray-400 block">vendido</span>
        </motion.div>

        {/* Progress bar */}
        <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-full rounded-full animate-shimmer"
            style={{
              background:
                "linear-gradient(90deg, #2d6a4f, #40916c, #2d6a4f, #40916c)",
              backgroundSize: "200% 100%",
            }}
          />
          {/* Milestone markers at 10%, 20%, ... 100% */}
          {Array.from({ length: 10 }, (_, i) => (i + 1) * 10).map((mark) => (
            <div
              key={mark}
              className="absolute top-0 bottom-0 w-0.5 bg-white/40"
              style={{ left: `${mark}%` }}
            />
          ))}
        </div>

        {/* Summary text */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm font-bold text-green-700"
        >
          {pct.toFixed(1)}% vendido &mdash; {milestonesReached} premio{milestonesReached !== 1 ? "s" : ""} liberado{milestonesReached !== 1 ? "s" : ""}!
        </motion.p>

        {/* Prize milestone list — shows from prize 11 (first to unlock) down to 1 (last) */}
        <div className="grid grid-cols-1 gap-2">
          {sorted.map((prize, idx) => {
            // Prize 11 unlocks at 10%, prize 10 at 20%, ... prize 1 at 110% (bonus)
            const prizeIndex = sorted.length - 1 - idx; // reverse: 11th prize = index 0 in display
            const milestone = (sorted.length - prize.position + 1) * 10;
            const unlocked = milestone <= pct * 10 / 10;
            const isNext = !unlocked && (milestone - 10) < pct;
            const milestoneLabel = milestone > 100 ? "Bônus" : `${milestone}%`;

            return (
              <motion.div
                key={prize.position}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.3 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  unlocked
                    ? "bg-green-50 border border-green-200"
                    : isNext
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-gray-50 border border-gray-100"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    unlocked
                      ? "bg-green-500 text-white"
                      : isNext
                        ? "bg-yellow-400 text-white"
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {unlocked ? "\u2713" : milestoneLabel}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      unlocked ? "text-green-800" : "text-gray-600"
                    }`}
                  >
                    {prize.position}º Prêmio — {prize.name}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {unlocked
                      ? "Liberado!"
                      : isNext
                        ? `Próximo — falta ${(milestone - pct).toFixed(1)}%`
                        : `Libera em ${milestoneLabel}`}
                  </p>
                </div>

                {unlocked && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, delay: 0.1 * idx }}
                    className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full"
                  >
                    ATIVO
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
