"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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

type WinnerInfo = {
  position: number;
  prizeName: string;
  winnerNumber: number;
  winnerName: string | null;
};

export function MilestoneProgress({ raffleId, prizes }: MilestoneProgressProps) {
  const { data } = useQuery({
    queryKey: ["progress", raffleId],
    queryFn: () => api.getProgress(raffleId),
    refetchInterval: 30_000,
  });
  const [winnerModal, setWinnerModal] = useState<WinnerInfo | null>(null);

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
              prize.position === 1 ? null : (prize.winnerNumber ?? prize.predestinedNumber ?? null);
            const isDrawn = !!prize.winnerNumber;

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
                    </p>
                  )}
                  {prize.winnerName && (
                    <p className="text-[11px] text-amber-700 font-semibold truncate">
                      Ganhador: {prize.winnerName}
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
                    className="shrink-0 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-mono"
                  >
                    {displayNumber.toString().padStart(6, "0")}
                  </motion.span>
                )}

                {isDrawn && (
                  <button
                    onClick={() =>
                      setWinnerModal({
                        position: prize.position,
                        prizeName: prize.name,
                        winnerNumber: prize.winnerNumber!,
                        winnerName: prize.winnerName ?? null,
                      })
                    }
                    className="shrink-0 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded-full transition-colors"
                  >
                    Ver Ganhador
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Winner modal */}
      <AnimatePresence>
        {winnerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5"
            onClick={() => setWinnerModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="text-center space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-amber-600 font-bold">
                  {winnerModal.position}º Prêmio
                </p>
                <h3 className="text-lg font-extrabold text-gray-900">
                  {winnerModal.prizeName}
                </h3>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider">
                  Número Sorteado
                </p>
                <p className="text-3xl font-extrabold font-mono text-amber-900">
                  {String(winnerModal.winnerNumber).padStart(6, "0")}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-1">
                <p className="text-xs text-green-700 font-semibold uppercase tracking-wider">
                  Ganhador
                </p>
                <p className="text-base font-bold text-green-900">
                  {winnerModal.winnerName ?? "Número não vendido"}
                </p>
              </div>

              <button
                onClick={() => setWinnerModal(null)}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
