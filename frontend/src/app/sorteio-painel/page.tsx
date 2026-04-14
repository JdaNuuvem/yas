"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { padNumber } from "@/lib/format";

const PANEL_PASSWORD = "sortear2026";

export default function SorteioPainelPage() {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [inputValues, setInputValues] = useState<Record<number, string>>({});

  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
    enabled: authenticated,
  });

  const drawMutation = useMutation({
    mutationFn: ({
      raffleId,
      position,
      numberValue,
    }: {
      raffleId: string;
      position: number;
      numberValue: number;
    }) => api.adminTriggerDraw(raffleId, position, numberValue),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
      window.open(`/sorteio/${variables.position}`, "_blank");
    },
  });

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === PANEL_PASSWORD) {
      setAuthenticated(true);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800 space-y-5">
          <h1 className="text-xl font-bold text-white text-center">Painel de Sorteio</h1>
          <input
            type="password"
            placeholder="Senha de acesso"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          {password && password !== PANEL_PASSWORD && (
            <p className="text-red-400 text-xs text-center">Senha incorreta</p>
          )}
          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  if (isLoading || !raffle) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  const sortedPrizes = [...raffle.prizes].sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-400">Painel de Sorteio</h1>
          <p className="text-gray-500 text-sm mt-1">
            Clique em &quot;Sortear&quot; para executar o sorteio e abrir a animação.
          </p>
        </div>

        <div className="space-y-3">
          {sortedPrizes.map((prize) => {
            const isDrawn = prize.winnerNumber !== null;

            return (
              <div
                key={prize.id}
                className="bg-gray-900 rounded-xl border border-gray-800 p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isDrawn ? "bg-green-600/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {prize.position}º
                  </span>
                  <div>
                    <h3 className="text-white font-medium">{prize.name}</h3>
                    {isDrawn && (
                      <p className="text-green-400 text-sm mt-0.5">
                        Vencedor: {padNumber(prize.winnerNumber!)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!isDrawn && (
                    <span />
                  )}

                  <button
                    onClick={() => {
                      drawMutation.mutate({
                        raffleId: raffle.id,
                        position: prize.position,
                        numberValue: 0,
                      });
                    }}
                    disabled={
                      isDrawn ||
                      (drawMutation.isPending &&
                        drawMutation.variables?.position === prize.position)
                    }
                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shrink-0 ${
                      isDrawn
                        ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                        : "bg-yellow-500 hover:bg-yellow-400 text-black"
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
              </div>
            );
          })}
        </div>

        {drawMutation.error && (
          <p className="text-red-400 text-sm text-center">
            {drawMutation.error instanceof Error
              ? drawMutation.error.message
              : "Erro ao realizar sorteio"}
          </p>
        )}
      </div>
    </div>
  );
}
