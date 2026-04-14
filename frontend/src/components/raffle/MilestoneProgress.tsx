"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

interface MilestoneProgressProps {
  raffleId: string;
  prizes: { position: number; name: string; winnerNumber: number | null; winnerName?: string | null; winnerCpfMasked?: string | null }[];
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
        {/* Prize milestone list header */}
        <h2 className="text-base font-bold text-gray-900 text-center">Prêmios</h2>


        {/* Prize milestone list — shows from prize 11 (first to unlock) down to 1 (last) */}
        <div className="grid grid-cols-1 gap-2">
          {sorted.map((prize, idx) => {
            const milestone = (sorted.length - prize.position + 1) * 10;
            const hasWinner = prize.winnerNumber !== null;
            const unlocked = hasWinner || milestone <= pct;
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
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      unlocked ? "text-green-800" : "text-gray-600"
                    }`}
                  >
                    {prize.position}º Prêmio — {prize.name}
                  </p>
                  {prize.winnerNumber ? (
                    <p className="text-[11px] text-green-600 font-medium">
                      Nº {prize.winnerNumber.toString().padStart(6, "0")}{prize.winnerName ? ` — ${prize.winnerName}` : ""}{prize.winnerCpfMasked ? ` (${prize.winnerCpfMasked})` : ""}
                    </p>
                  ) : null}
                </div>

                {prize.winnerNumber ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, delay: 0.1 * idx }}
                    className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-mono"
                  >
                    {prize.winnerNumber.toString().padStart(6, "0")}
                  </motion.span>
                ) : unlocked ? (
                  <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                    ATIVO
                  </span>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
