"use client";

import { motion } from "framer-motion";
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

  if (!buyers || buyers.length === 0) return null;

  return (
    <section className="px-5 space-y-3">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
        Top Compradores
      </h3>
      <div className="card divide-y divide-gray-100">
        {buyers.slice(0, 5).map((buyer, idx) => (
          <motion.div
            key={`${buyer.name}-${idx}`}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ backgroundColor: "rgba(34,197,94,0.05)" }}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span
              className={`text-sm font-black w-6 text-center ${
                idx === 0
                  ? "text-yellow-500"
                  : idx === 1
                    ? "text-gray-400"
                    : idx === 2
                      ? "text-amber-600"
                      : "text-gray-300"
              }`}
            >
              {idx + 1}
            </span>
            <span className="text-gray-600 text-sm flex-1 truncate">
              {maskName(buyer.name)}
            </span>
            <span className="text-green-600 text-xs font-bold">
              {buyer.totalNumbers}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
