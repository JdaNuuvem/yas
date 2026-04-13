"use client";

import { useState } from "react";
import type { Prize } from "@/types";

interface PrizeTableProps {
  prizes: Prize[];
}

type Filter = "all" | "available" | "drawn";

export function PrizeTable({ prizes }: PrizeTableProps) {
  const [filter, setFilter] = useState<Filter>("all");
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
          const isDrawn = prize.winnerNumber !== null;
          return (
            <div
              key={prize.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isDrawn
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {prize.position}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium truncate">
                  {prize.name}
                </p>
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  isDrawn
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {isDrawn ? "Sorteado" : "Disponível"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
