"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { maskName } from "@/lib/format";

interface TopBuyersProps {
  raffleId: string;
}

export function TopBuyers({ raffleId }: TopBuyersProps) {
  const { data: buyers } = useQuery({
    queryKey: ["topBuyers", raffleId],
    queryFn: () => api.getTopBuyers(raffleId),
    refetchInterval: 30000,
  });

  if (!buyers || buyers.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white">Top Compradores</h2>
      <div className="bg-gray-800 rounded-xl divide-y divide-gray-700">
        {buyers.slice(0, 10).map((buyer, idx) => (
          <div
            key={`${buyer.buyerName}-${idx}`}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span
              className={`text-sm font-bold w-6 text-center ${
                idx === 0
                  ? "text-yellow-400"
                  : idx === 1
                    ? "text-gray-300"
                    : idx === 2
                      ? "text-amber-600"
                      : "text-gray-500"
              }`}
            >
              {idx + 1}
            </span>
            <span className="text-gray-300 text-sm flex-1">
              {maskName(buyer.buyerName)}
            </span>
            <span className="text-green-400 text-sm font-medium">
              {buyer.totalNumbers} numeros
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
