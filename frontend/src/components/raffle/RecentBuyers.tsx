"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { maskName } from "@/lib/format";

interface RecentBuyersProps {
  raffleId: string;
}

export function RecentBuyers({ raffleId }: RecentBuyersProps) {
  const { data: buyers } = useQuery({
    queryKey: ["recentBuyers", raffleId],
    queryFn: () => api.getRecentBuyers(raffleId),
    refetchInterval: 10000,
  });

  if (!buyers || buyers.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white">Compras Recentes</h2>
      <div className="bg-gray-800 rounded-xl divide-y divide-gray-700">
        {buyers.map((buyer, idx) => (
          <div
            key={`${buyer.buyerName}-${buyer.createdAt}-${idx}`}
            className="flex items-center justify-between px-4 py-3"
          >
            <span className="text-gray-300 text-sm">
              {maskName(buyer.buyerName)}
            </span>
            <span className="text-green-400 text-sm font-medium">
              {buyer.quantity} {buyer.quantity === 1 ? "numero" : "numeros"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
