"use client";

import Image from "next/image";
import type { Prize } from "@/types";

interface PrizeListProps {
  prizes: Prize[];
}

export function PrizeList({ prizes }: PrizeListProps) {
  const sorted = [...prizes].sort((a, b) => a.position - b.position);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white">Premios</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {sorted.map((prize) => {
          const isFirst = prize.position === 1;
          return (
            <div
              key={prize.id}
              className={`bg-gray-800 rounded-xl p-3 flex flex-col items-center text-center space-y-2
                ${isFirst ? "border-2 border-yellow-400 col-span-2 md:col-span-1" : "border border-gray-700"}`}
            >
              {prize.imageUrl && (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={prize.imageUrl}
                    alt={prize.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <span
                className={`text-xs font-bold ${isFirst ? "text-yellow-400" : "text-gray-500"}`}
              >
                {prize.position}o Premio
              </span>
              <span className="text-white text-sm font-medium">
                {prize.name}
              </span>
              {prize.description && (
                <span className="text-gray-400 text-xs">
                  {prize.description}
                </span>
              )}
              {prize.winnerNumber !== null && (
                <span className="text-green-400 text-xs font-mono">
                  Ganhador: {String(prize.winnerNumber).padStart(6, "0")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
