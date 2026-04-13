"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { padNumber } from "@/lib/format";

export default function AdminSorteioPage() {
  const queryClient = useQueryClient();

  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const drawMutation = useMutation({
    mutationFn: ({
      raffleId,
      position,
    }: {
      raffleId: string;
      position: number;
    }) => api.adminTriggerDraw(raffleId, position),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
      window.open(`/sorteio/${variables.position}`, "_blank");
    },
  });

  if (isLoading || !raffle) {
    return (
      <div className="text-gray-400 text-center py-20">Carregando...</div>
    );
  }

  const sortedPrizes = [...raffle.prizes].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Sorteio</h1>

      <div className="space-y-3">
        {sortedPrizes.map((prize) => {
          const isDrawn = prize.winnerNumber !== null;

          return (
            <div
              key={prize.id}
              className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-indigo-400">
                  {prize.position}o Premio
                </span>
                <h3 className="text-white font-semibold">{prize.name}</h3>
                {isDrawn && (
                  <p className="text-green-400 text-sm mt-1">
                    Numero vencedor: {padNumber(prize.winnerNumber!)}
                  </p>
                )}
              </div>

              <button
                onClick={() =>
                  drawMutation.mutate({
                    raffleId: raffle.id,
                    position: prize.position,
                  })
                }
                disabled={
                  isDrawn ||
                  (drawMutation.isPending &&
                    drawMutation.variables?.position === prize.position)
                }
                className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  isDrawn
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {isDrawn
                  ? "Sorteado"
                  : drawMutation.isPending &&
                      drawMutation.variables?.position === prize.position
                    ? "Sorteando..."
                    : "Sortear"}
              </button>
            </div>
          );
        })}
      </div>

      {drawMutation.error && (
        <p className="text-red-400 text-sm">
          {drawMutation.error instanceof Error
            ? drawMutation.error.message
            : "Erro ao realizar sorteio"}
        </p>
      )}
    </div>
  );
}
