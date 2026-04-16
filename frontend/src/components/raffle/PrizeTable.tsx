"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prize } from "@/types";

interface PrizeTableProps {
  prizes: Prize[];
  raffleId: string;
}

function formatNumber(n: number): string {
  return String(n).padStart(6, "0");
}

type Filter = "all" | "available" | "drawn";

type WinnerInfo = {
  position: number;
  prizeName: string;
  winnerNumber: number;
  winnerName: string | null;
};

export function PrizeTable({ prizes }: PrizeTableProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [winnerModal, setWinnerModal] = useState<WinnerInfo | null>(null);
  const sorted = [...prizes].sort((a, b) => a.position - b.position);

  const filtered = sorted.filter((p) => {
    if (filter === "available") return p.winnerNumber === null;
    if (filter === "drawn") return p.winnerNumber !== null;
    return true;
  });

  const availableCount = sorted.filter((p) => p.winnerNumber === null).length;
  const drawnCount = sorted.filter((p) => p.winnerNumber !== null).length;

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Total", count: sorted.length },
    { key: "available", label: "Disponíveis", count: availableCount },
    { key: "drawn", label: "Sorteados", count: drawnCount },
  ];

  return (
    <section className="px-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">&#x1F3C6;</span>
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Títulos premiados
          </h2>
          <p className="text-gray-400 text-xs">Veja a lista de prêmios</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 rounded-xl py-2.5 text-center text-xs font-semibold transition-all ${
              filter === key
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {label}{" "}
            <span className="font-bold">{count}</span>
          </button>
        ))}
      </div>

      {/* Prize list */}
      <div className="card divide-y divide-gray-100 overflow-hidden">
        {filtered.map((prize) => {
          const displayNumber =
            prize.position === 1 ? null : (prize.winnerNumber ?? (prize as any).predestinedNumber ?? null);

          return (
            <div
              key={prize.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-green-100 text-green-700">
                {prize.position}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium truncate">
                  {prize.name}
                </p>
              </div>
              {displayNumber !== null && (
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-mono shrink-0">
                  {formatNumber(displayNumber)}
                </span>
              )}
              {prize.winnerNumber && (
                <button
                  onClick={() =>
                    setWinnerModal({
                      position: prize.position,
                      prizeName: prize.name,
                      winnerNumber: prize.winnerNumber!,
                      winnerName: prize.winnerName ?? null,
                    })
                  }
                  className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-full shrink-0 transition-colors"
                >
                  Ver Ganhador
                </button>
              )}
            </div>
          );
        })}
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
                  {formatNumber(winnerModal.winnerNumber)}
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
