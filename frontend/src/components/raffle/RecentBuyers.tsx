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

  if (!buyers || buyers.length === 0) return null;

  const doubled = [...buyers, ...buyers];

  return (
    <section className="space-y-3 overflow-hidden">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-5">
        Comprando agora
      </h3>
      <div className="relative">
        <div className="flex gap-3 animate-ticker whitespace-nowrap px-5">
          {doubled.map((buyer, idx) => (
            <div
              key={`${buyer.buyerName}-${idx}`}
              className="inline-flex items-center gap-2 card px-4 py-2 flex-shrink-0"
            >
              <span className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                {buyer.buyerName[0]?.toUpperCase()}
              </span>
              <span className="text-gray-600 text-sm font-medium">
                {maskName(buyer.buyerName)}
              </span>
              <span className="text-green-600 text-xs font-bold">
                +{buyer.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
