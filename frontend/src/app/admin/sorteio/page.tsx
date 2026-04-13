"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { padNumber } from "@/lib/format";

interface PresetRow {
  numberValue: string;
  saved: boolean;
}

export default function AdminSorteioPage() {
  const queryClient = useQueryClient();
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [presets, setPresets] = useState<Record<number, PresetRow>>({});

  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const setWinnerMutation = useMutation({
    mutationFn: ({ position, numberValue }: { position: number; numberValue: number }) =>
      api.adminSetWinner(raffle!.id, position, numberValue),
    onSuccess: (_data, variables) => {
      setPresets((prev) => ({
        ...prev,
        [variables.position]: { ...prev[variables.position], saved: true },
      }));
    },
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

  if (isLoading || !raffle) {
    return (
      <div className="text-gray-400 text-center py-20">Carregando...</div>
    );
  }

  const sortedPrizes = [...raffle.prizes].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Sorteio</h1>

      {/* Etapa 1: Predefinir vencedores */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">1. Predefinir Vencedores</h2>
          <p className="text-sm text-gray-500 mt-1">
            Defina os números vencedores antes de executar o sorteio.
          </p>
        </div>

        <div className="space-y-2">
          {sortedPrizes.map((prize) => {
            const isDrawn = prize.winnerNumber !== null;
            const preset = presets[prize.position];

            return (
              <div
                key={`preset-${prize.id}`}
                className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center gap-4"
              >
                <span className="w-9 h-9 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">
                  {prize.position}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{prize.name}</p>
                </div>

                {isDrawn ? (
                  <span className="text-green-400 text-sm font-medium shrink-0">
                    Já sorteado: {padNumber(prize.winnerNumber!)}
                  </span>
                ) : (
                  <>
                    <input
                      type="number"
                      min={1}
                      max={1000000}
                      value={preset?.numberValue ?? ""}
                      onChange={(e) =>
                        setPresets((prev) => ({
                          ...prev,
                          [prize.position]: { numberValue: e.target.value, saved: false },
                        }))
                      }
                      placeholder="Número vencedor"
                      className="w-40 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => {
                        const val = parseInt(preset?.numberValue, 10);
                        if (isNaN(val) || val < 1) return;
                        setWinnerMutation.mutate({ position: prize.position, numberValue: val });
                      }}
                      disabled={!preset?.numberValue || setWinnerMutation.isPending}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
                    >
                      Definir
                    </button>
                    {preset?.saved && (
                      <span className="text-green-400 text-xs font-medium shrink-0">Salvo</span>
                    )}
                  </>
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

      <hr className="border-gray-800" />

      {/* Etapa 2: Executar sorteio */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">2. Executar Sorteio</h2>
          <p className="text-sm text-gray-500 mt-1">
            Clique para executar o sorteio e abrir a animação ao vivo.
          </p>
        </div>

        <div className="space-y-2">
          {sortedPrizes.map((prize) => {
            const isDrawn = prize.winnerNumber !== null;

            return (
              <div
                key={`draw-${prize.id}`}
                className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="w-9 h-9 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">
                    {prize.position}
                  </span>
                  <div>
                    <h3 className="text-white font-medium text-sm">{prize.name}</h3>
                    {isDrawn && (
                      <p className="text-green-400 text-xs mt-0.5">
                        Vencedor: {padNumber(prize.winnerNumber!)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!isDrawn && (
                    <input
                      type="number"
                      min={1}
                      max={1000000}
                      placeholder="Número"
                      className="w-36 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={inputValues[prize.position] || ""}
                      onChange={(e) =>
                        setInputValues({
                          ...inputValues,
                          [prize.position]: e.target.value,
                        })
                      }
                    />
                  )}

                  <button
                    onClick={() => {
                      const val = parseInt(inputValues[prize.position], 10);
                      if (isNaN(val) || val < 1) return;
                      drawMutation.mutate({
                        raffleId: raffle.id,
                        position: prize.position,
                        numberValue: val,
                      });
                    }}
                    disabled={
                      isDrawn ||
                      (drawMutation.isPending &&
                        drawMutation.variables?.position === prize.position) ||
                      !inputValues[prize.position]
                    }
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors shrink-0 ${
                      isDrawn || !inputValues[prize.position]
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
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
          <p className="text-red-400 text-sm">
            {drawMutation.error instanceof Error
              ? drawMutation.error.message
              : "Erro ao realizar sorteio"}
          </p>
        )}
      </div>
    </div>
  );
}
