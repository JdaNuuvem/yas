"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

interface MilestoneProgressProps {
  raffleId: string;
  prizes: {
    position: number;
    name: string;
    winnerNumber: number | null;
    winnerName?: string | null;
    winnerCpfMasked?: string | null;
    predestinedNumber?: number | null;
    predestinedBuyerName?: string | null;
  }[];
}

export function MilestoneProgress({ raffleId, prizes }: MilestoneProgressProps) {
  const { data } = useQuery({
    queryKey: ["progress", raffleId],
    queryFn: () => api.getProgress(raffleId),
    refetchInterval: 30_000,
  });

  if (!data) return null;

  const sorted = [...prizes].sort((a, b) => b.position - a.position);

  return (
    <section className="px-5 space-y-4">
      <div className="card p-5 space-y-4">
        <h2 className="text-base font-bold text-gray-900 text-center">
          Prêmios
        </h2>

        <div className="grid grid-cols-1 gap-2">
          {sorted.map((prize, idx) => {
            const displayNumber =
              prize.winnerNumber ?? prize.predestinedNumber ?? null;
            const buyerName =
              prize.winnerName ?? prize.predestinedBuyerName ?? null;

            return (
              <motion.div
                key={prize.position}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.3 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-green-800">
                    {prize.position}º Prêmio — {prize.name}
                  </p>
                  {displayNumber !== null && (
                    <p className="text-[11px] text-green-600 font-medium font-mono">
                      Nº {displayNumber.toString().padStart(6, "0")}
                      {buyerName ? ` — ${buyerName}` : ""}
                      {prize.winnerCpfMasked
                        ? ` (${prize.winnerCpfMasked})`
                        : ""}
                    </p>
                  )}
                </div>

                {displayNumber !== null && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      delay: 0.1 * idx,
                    }}
                    className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-mono"
                  >
                    {displayNumber.toString().padStart(6, "0")}
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
