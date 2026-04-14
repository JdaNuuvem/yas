"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { masterApi } from "@/lib/api-master";
import { padNumber } from "@/lib/format";

export default function MasterSorteioPage() {
  const queryClient = useQueryClient();

  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const [values, setValues] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  const setWinnerMutation = useMutation({
    mutationFn: ({ position, numberValue }: { position: number; numberValue: number }) =>
      masterApi.setWinner(raffle!.id, position, numberValue),
    onSuccess: (_data, variables) => {
      setSaved((prev) => ({ ...prev, [variables.position]: true }));
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
    },
  });

  const [testResult, setTestResult] = useState<Record<number, string>>({});

  const testDrawMutation = useMutation({
    mutationFn: (position: number) => masterApi.testDraw(raffle!.id, position),
    onSuccess: (data, position) => {
      setTestResult((prev) => ({
        ...prev,
        [position]: `Sorteado: ${data.winnerNumber.toString().padStart(6, "0")} → ${data.winnerName}`,
      }));
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
    },
    onError: (err, position) => {
      setTestResult((prev) => ({
        ...prev,
        [position]: `Erro: ${err instanceof Error ? err.message : "falha"}`,
      }));
    },
  });

  function handleDefine(position: number) {
    const val = parseInt(values[position], 10);
    if (isNaN(val) || val < 1) return;
    setWinnerMutation.mutate({ position, numberValue: val });
  }

  if (isLoading || !raffle) {
    return <div className="text-gray-400 text-center py-20">Carregando...</div>;
  }

  const sortedPrizes = [...raffle.prizes].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-red-400">Predefinir Sorteio</h1>
        <p className="text-sm text-gray-500 mt-1">
          Defina o número vencedor de cada prêmio. Quando o progresso atingir o milestone,
          o prêmio será sorteado automaticamente com o número definido aqui.
          Se nenhum número for definido, será sorteado aleatoriamente.
        </p>
      </div>

      <div className="space-y-3">
        {sortedPrizes.map((prize) => {
          const isDrawn = prize.winnerNumber !== null;

          return (
            <div
              key={prize.id}
              className="bg-gray-900 rounded-xl p-4 border border-red-900/30 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-400 font-bold text-sm shrink-0">
                {prize.position}º
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{prize.name}</p>
                {isDrawn && (
                  <p className="text-green-400 text-xs">
                    Já sorteado: {padNumber(prize.winnerNumber!)}
                  </p>
                )}
              </div>

              {isDrawn ? (
                <span className="text-green-400 text-xs font-bold bg-green-400/10 px-3 py-1.5 rounded-lg">
                  Sorteado
                </span>
              ) : (
                <>
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    value={values[prize.position] ?? ""}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, [prize.position]: e.target.value }));
                      setSaved((prev) => ({ ...prev, [prize.position]: false }));
                    }}
                    placeholder="Número"
                    className="w-28 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={() => handleDefine(prize.position)}
                    disabled={!values[prize.position] || setWinnerMutation.isPending}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
                  >
                    Definir
                  </button>
                  <button
                    onClick={() => testDrawMutation.mutate(prize.position)}
                    disabled={testDrawMutation.isPending}
                    className="px-3 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-xs font-bold rounded-lg transition-colors shrink-0"
                  >
                    Testar
                  </button>
                  {saved[prize.position] && (
                    <span className="text-green-400 text-xs font-medium shrink-0">Salvo</span>
                  )}
                </>
              )}
              {testResult[prize.position] && (
                <span className={`text-xs shrink-0 ${testResult[prize.position].startsWith("Erro") ? "text-red-400" : "text-yellow-300"}`}>
                  {testResult[prize.position]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {setWinnerMutation.error && (
        <p className="text-red-400 text-sm">
          {setWinnerMutation.error instanceof Error
            ? setWinnerMutation.error.message
            : "Erro ao definir vencedor"}
        </p>
      )}
    </div>
  );
}
