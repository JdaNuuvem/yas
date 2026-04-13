"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function AdminPremiosPage() {
  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  if (isLoading || !raffle) {
    return (
      <div className="text-gray-400 text-center py-20">Carregando...</div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Premios</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {raffle.prizes
          .sort((a, b) => a.position - b.position)
          .map((prize) => (
            <div
              key={prize.id}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex"
            >
              {prize.imageUrl && (
                <img
                  src={prize.imageUrl}
                  alt={prize.name}
                  className="w-28 h-28 object-cover flex-shrink-0"
                />
              )}
              <div className="p-4 flex flex-col justify-center">
                <span className="text-xs font-semibold text-indigo-400 mb-1">
                  {prize.position}o Premio
                </span>
                <h3 className="text-white font-semibold">{prize.name}</h3>
                {prize.description && (
                  <p className="text-gray-400 text-sm mt-1">
                    {prize.description}
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
