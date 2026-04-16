"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { masterApi } from "@/lib/api-master";
import { padNumber } from "@/lib/format";

interface PrizeForm {
  numberValue: string;
  buyerName: string;
  buyerCpf: string;
  buyerPhone: string;
}

export default function MasterSorteioPage() {
  const queryClient = useQueryClient();

  const { data: raffle, isLoading: raffleLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const { data: predestination, isLoading: predLoading } = useQuery({
    queryKey: ["prizes-predestination", raffle?.id],
    queryFn: () => masterApi.getPrizePredestination(raffle!.id),
    enabled: !!raffle?.id,
  });

  const [forms, setForms] = useState<Record<number, PrizeForm>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [expandedPosition, setExpandedPosition] = useState<number | null>(null);

  const predestineMutation = useMutation({
    mutationFn: (data: {
      raffleId: string;
      position: number;
      numberValue: number;
      buyerName: string;
      buyerCpf: string;
      buyerPhone: string;
    }) => masterApi.predestinePrize(data),
    onSuccess: (_data, variables) => {
      setSaved((prev) => ({ ...prev, [variables.position]: true }));
      setExpandedPosition(null);
      queryClient.invalidateQueries({ queryKey: ["prizes-predestination"] });
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ position }: { position: number }) =>
      masterApi.removePredestination(raffle!.id, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prizes-predestination"] });
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: ({ position }: { position: number }) =>
      masterApi.releasePrizeNumber(raffle!.id, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prizes-predestination"] });
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
    },
  });

  const [forceError, setForceError] = useState<string | null>(null);
  const forceMutation = useMutation({
    mutationFn: ({ position, numberValue }: { position: number; numberValue: number | null }) =>
      masterApi.forceSetPrizeNumber(raffle!.id, position, numberValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prizes-predestination"] });
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
      setForceError(null);
    },
    onError: (err) => {
      setForceError(err instanceof Error ? err.message : "Erro ao forçar número");
    },
  });

  const [winnerError, setWinnerError] = useState<string | null>(null);
  const winnerMutation = useMutation({
    mutationFn: ({ position, numberValue }: { position: number; numberValue: number | null }) =>
      masterApi.setPrizeWinner(raffle!.id, position, numberValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prizes-predestination"] });
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
      setWinnerError(null);
    },
    onError: (err) => {
      setWinnerError(err instanceof Error ? err.message : "Erro ao editar ganhador");
    },
  });

  const [unassignResult, setUnassignResult] = useState<string | null>(null);
  const unassignMutation = useMutation({
    mutationFn: (numberValue: number) =>
      masterApi.unassignNumber(raffle!.id, numberValue),
    onSuccess: (data) => {
      const prev = data.previousBuyer
        ? `${data.previousBuyer.name} (${data.previousBuyer.phone})`
        : "ninguém";
      const cleared = data.clearedPrizePositions.length
        ? ` · predestinação dos prêmios ${data.clearedPrizePositions.join(", ")} zerada`
        : "";
      setUnassignResult(
        `✓ Nº ${String(data.numberValue).padStart(6, "0")} liberado (era de ${prev})${cleared}`,
      );
      queryClient.invalidateQueries({ queryKey: ["prizes-predestination"] });
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
    },
    onError: (err) => {
      setUnassignResult(
        `Erro: ${err instanceof Error ? err.message : "falha ao liberar"}`,
      );
    },
  });

  const [milestoneResult, setMilestoneResult] = useState("");

  const milestoneMutation = useMutation({
    mutationFn: () => masterApi.simulateMilestone(raffle!.id),
    onSuccess: (data) => {
      if (data.success) {
        setMilestoneResult(
          `${data.milestone} → ${data.position}º Prêmio (${data.prizeName}) → Nº ${data.winnerNumber?.toString().padStart(6, "0")} → ${data.winnerName}`,
        );
      } else {
        setMilestoneResult(data.message ?? "Nenhum prêmio para sortear");
      }
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
      queryClient.invalidateQueries({ queryKey: ["prizes-predestination"] });
    },
    onError: (err) => {
      setMilestoneResult(
        `Erro: ${err instanceof Error ? err.message : "falha"}`,
      );
    },
  });

  function getForm(position: number): PrizeForm {
    return (
      forms[position] ?? {
        numberValue: "",
        buyerName: "",
        buyerCpf: "",
        buyerPhone: "",
      }
    );
  }

  function updateForm(position: number, partial: Partial<PrizeForm>) {
    setForms((prev) => ({
      ...prev,
      [position]: { ...getForm(position), ...partial },
    }));
    setSaved((prev) => ({ ...prev, [position]: false }));
  }

  function handlePredestine(position: number) {
    const form = getForm(position);
    const num = parseInt(form.numberValue, 10);
    if (isNaN(num) || num < 1 || !form.buyerName.trim() || !form.buyerPhone.trim()) return;
    predestineMutation.mutate({
      raffleId: raffle!.id,
      position,
      numberValue: num,
      buyerName: form.buyerName.trim(),
      buyerCpf: form.buyerCpf.replace(/\D/g, ""),
      buyerPhone: form.buyerPhone.replace(/\D/g, ""),
    });
  }

  if (raffleLoading || !raffle || predLoading) {
    return (
      <div className="text-gray-400 text-center py-20">Carregando...</div>
    );
  }

  const prizes = predestination ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-red-400">
          Predestinar Prêmios
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Defina o número vencedor e o comprador para cada prêmio. Prêmios já
          associados a um cliente ficam travados.
        </p>
      </div>

      {/* Simulate milestone button */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-yellow-400 font-semibold">Simular Meta</h2>
            <p className="text-gray-500 text-xs mt-1">
              Simula bater a próxima meta e sorteia o prêmio correspondente
            </p>
          </div>
          <button
            onClick={() => milestoneMutation.mutate()}
            disabled={milestoneMutation.isPending}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-6 py-3 rounded-lg transition-colors"
          >
            {milestoneMutation.isPending ? "Sorteando..." : "Bater Próxima Meta"}
          </button>
        </div>
        {milestoneResult && (
          <p
            className={`text-sm ${milestoneResult.startsWith("Erro") ? "text-red-400" : "text-yellow-300"}`}
          >
            {milestoneResult}
          </p>
        )}
      </div>

      {forceError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{forceError}</p>
        </div>
      )}

      {winnerError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{winnerError}</p>
        </div>
      )}

      {/* Liberar número atribuído indevidamente */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-blue-400 font-semibold">Liberar Número</h2>
            <p className="text-gray-500 text-xs mt-1">
              Remove a atribuição de um número a um comprador e devolve
              para disponível. Zera também predestinações desse número.
            </p>
          </div>
          <button
            onClick={() => {
              const input = prompt(
                "Número a liberar (ex: 259659). O comprador atual perde o número.",
              );
              if (input === null) return;
              const n = parseInt(input.trim(), 10);
              if (isNaN(n) || n < 1 || n > 1_000_000) {
                alert("Número inválido (1 a 1.000.000)");
                return;
              }
              if (
                !confirm(
                  `Confirmar liberação do número ${String(n).padStart(6, "0")}? Esta ação desassocia o comprador atual.`,
                )
              ) {
                return;
              }
              setUnassignResult(null);
              unassignMutation.mutate(n);
            }}
            disabled={unassignMutation.isPending}
            className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-lg transition-colors shrink-0"
          >
            {unassignMutation.isPending ? "Liberando..." : "Liberar Número"}
          </button>
        </div>
        {unassignResult && (
          <p
            className={`text-sm ${unassignResult.startsWith("Erro") ? "text-red-400" : "text-blue-300"}`}
          >
            {unassignResult}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {prizes.map((prize) => {
          const isDrawn = prize.drawn;
          const isLocked = prize.locked;
          const isExpanded = expandedPosition === prize.position;
          const form = getForm(prize.position);
          const isNonDrawable = prize.position === 1; // 1º prêmio não é sorteado por número

          return (
            <div
              key={prize.id}
              className={`bg-gray-900 rounded-xl border ${
                isLocked
                  ? "border-green-600/30"
                  : isDrawn
                    ? "border-gray-700"
                    : "border-red-900/30"
              } overflow-hidden`}
            >
              {/* Prize header row */}
              <div className="p-4 flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isLocked
                      ? "bg-green-600/20 text-green-400"
                      : isDrawn
                        ? "bg-gray-700/50 text-gray-500"
                        : "bg-red-600/20 text-red-400"
                  }`}
                >
                  {prize.position}º
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {prize.name}
                  </p>
                  {isNonDrawable && (
                    <p className="text-purple-300 text-xs font-semibold">
                      Não é sorteado por número
                    </p>
                  )}
                  {isDrawn && !isNonDrawable && (
                    <p className="text-gray-500 text-xs">
                      Sorteado: {padNumber(prize.winnerNumber!)}
                    </p>
                  )}
                  {!isNonDrawable && !isDrawn && prize.predestinedNumber !== null && (() => {
                    const isSold = prize.numberStatus === "SOLD";
                    const isReserved = prize.numberStatus === "RESERVED";
                    const isTaken = isSold || isReserved || !!prize.buyerName;
                    const color = isLocked
                      ? "text-green-400"
                      : prize.buyerName
                        ? "text-blue-400"
                        : isTaken
                          ? "text-orange-400"
                          : prize.hasExplicitPredestination
                            ? "text-yellow-400"
                            : "text-gray-400";
                    return (
                      <p className={`text-xs ${color}`}>
                        Nº {padNumber(prize.predestinedNumber)}
                        {prize.buyerName ? (
                          <>
                            {" "}
                            → {prize.buyerName}
                            {prize.buyerPhone ? ` (${prize.buyerPhone})` : ""}
                            {!prize.hasExplicitPredestination && (
                              <span className="ml-1 text-[10px] opacity-80">
                                (comprador real)
                              </span>
                            )}
                          </>
                        ) : isSold ? (
                          " · JÁ VENDIDO (comprador não identificado)"
                        ) : isReserved ? (
                          " · reservado por um comprador"
                        ) : prize.hasExplicitPredestination ? (
                          " (sem comprador associado)"
                        ) : (
                          " (sem predestinação · não vendido)"
                        )}
                      </p>
                    );
                  })()}
                </div>

                {isNonDrawable ? (
                  <span className="text-purple-300 text-xs font-bold bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/30">
                    Premiação externa
                  </span>
                ) : isDrawn ? (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="text-gray-500 text-xs font-bold bg-gray-700/30 px-3 py-1.5 rounded-lg">
                      Sorteado
                    </span>
                    <button
                      onClick={() => {
                        const current = prize.winnerNumber ?? "";
                        const input = prompt(
                          `Editar número sorteado do ${prize.position}º prêmio. Mantém o(s) atual(is) comprador(es) desse número como ganhador, sem atribuir ninguém novo. Deixe vazio para desfazer o sorteio.`,
                          String(current),
                        );
                        if (input === null) return;
                        const trimmed = input.trim();
                        if (trimmed === "") {
                          if (confirm(`Desfazer o sorteio do ${prize.position}º prêmio?`)) {
                            winnerMutation.mutate({ position: prize.position, numberValue: null });
                          }
                          return;
                        }
                        const n = parseInt(trimmed, 10);
                        if (isNaN(n) || n < 1 || n > 1_000_000) {
                          alert("Número inválido (1 a 1.000.000)");
                          return;
                        }
                        winnerMutation.mutate({ position: prize.position, numberValue: n });
                      }}
                      disabled={winnerMutation.isPending}
                      className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1.5 rounded-lg hover:bg-blue-600/10 transition-colors"
                    >
                      Editar Ganhador
                    </button>
                  </div>
                ) : isLocked ? (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {!(prize as any).milestoneReached && !(prize as any).released && (
                      <button
                        onClick={() => {
                          if (confirm(`Liberar o número do ${prize.position}º prêmio para compra? (a meta ainda não foi batida)`)) {
                            releaseMutation.mutate({ position: prize.position });
                          }
                        }}
                        disabled={releaseMutation.isPending}
                        className="text-yellow-400 hover:text-yellow-300 text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors font-semibold"
                      >
                        Liberar Nº
                      </button>
                    )}
                    {(prize as any).released && !(prize as any).milestoneReached && (
                      <span className="text-yellow-400 text-xs font-bold bg-yellow-400/10 px-3 py-1.5 rounded-lg">
                        Liberado
                      </span>
                    )}
                    <span className="text-green-400 text-xs font-bold bg-green-400/10 px-3 py-1.5 rounded-lg">
                      Travado
                    </span>
                    <button
                      onClick={() => {
                        const current = prize.predestinedNumber ?? "";
                        const input = prompt(
                          `Novo número para o ${prize.position}º prêmio (mantém o comprador atual desse número). Deixe vazio para zerar.`,
                          String(current),
                        );
                        if (input === null) return;
                        const trimmed = input.trim();
                        if (trimmed === "") {
                          if (confirm(`Zerar o número do ${prize.position}º prêmio?`)) {
                            forceMutation.mutate({ position: prize.position, numberValue: null });
                          }
                          return;
                        }
                        const n = parseInt(trimmed, 10);
                        if (isNaN(n) || n < 1 || n > 1_000_000) {
                          alert("Número inválido (1 a 1.000.000)");
                          return;
                        }
                        forceMutation.mutate({ position: prize.position, numberValue: n });
                      }}
                      disabled={forceMutation.isPending}
                      className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1.5 rounded-lg hover:bg-blue-600/10 transition-colors"
                    >
                      Editar Nº
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Remover predestinação do ${prize.position}º prêmio? O número continuará vendido ao comprador.`,
                          )
                        ) {
                          removeMutation.mutate({
                            position: prize.position,
                          });
                        }
                      }}
                      disabled={removeMutation.isPending}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1.5 rounded-lg hover:bg-red-600/10 transition-colors"
                    >
                      Destravar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => {
                        const current = prize.predestinedNumber ?? "";
                        const input = prompt(
                          `Novo número para o ${prize.position}º prêmio (mantém o comprador atual desse número). Deixe vazio para zerar.`,
                          String(current),
                        );
                        if (input === null) return;
                        const trimmed = input.trim();
                        if (trimmed === "") {
                          if (confirm(`Zerar o número do ${prize.position}º prêmio?`)) {
                            forceMutation.mutate({ position: prize.position, numberValue: null });
                          }
                          return;
                        }
                        const n = parseInt(trimmed, 10);
                        if (isNaN(n) || n < 1 || n > 1_000_000) {
                          alert("Número inválido (1 a 1.000.000)");
                          return;
                        }
                        forceMutation.mutate({ position: prize.position, numberValue: n });
                      }}
                      disabled={forceMutation.isPending}
                      className="text-blue-400 hover:text-blue-300 text-xs px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 transition-colors font-semibold"
                    >
                      Editar Nº
                    </button>
                    <button
                      onClick={() =>
                        setExpandedPosition(isExpanded ? null : prize.position)
                      }
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
                    >
                      {isExpanded ? "Fechar" : "Predestinar"}
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded form for setting predestination */}
              {isExpanded && !isDrawn && !isLocked && (
                <div className="px-4 pb-4 pt-0 border-t border-red-900/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Número da Cota
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={1000000}
                        value={form.numberValue}
                        onChange={(e) =>
                          updateForm(prize.position, {
                            numberValue: e.target.value.slice(0, 7),
                          })
                        }
                        placeholder="Ex: 123456"
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Nome do Cliente
                      </label>
                      <input
                        type="text"
                        value={form.buyerName}
                        onChange={(e) =>
                          updateForm(prize.position, {
                            buyerName: e.target.value.slice(0, 100),
                          })
                        }
                        placeholder="Nome completo"
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        CPF
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.buyerCpf}
                        onChange={(e) =>
                          updateForm(prize.position, {
                            buyerCpf: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 11),
                          })
                        }
                        placeholder="00000000000"
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={form.buyerPhone}
                        onChange={(e) =>
                          updateForm(prize.position, {
                            buyerPhone: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 11),
                          })
                        }
                        placeholder="11999998888"
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  {predestineMutation.error &&
                    expandedPosition === prize.position && (
                      <p className="text-red-400 text-sm">
                        {predestineMutation.error instanceof Error
                          ? predestineMutation.error.message
                          : "Erro ao predestinar"}
                      </p>
                    )}

                  {saved[prize.position] && (
                    <p className="text-green-400 text-sm">
                      Predestinação salva com sucesso!
                    </p>
                  )}

                  <button
                    onClick={() => handlePredestine(prize.position)}
                    disabled={
                      predestineMutation.isPending ||
                      !form.numberValue ||
                      !form.buyerName.trim() ||
                      !form.buyerPhone.trim()
                    }
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {predestineMutation.isPending
                      ? "Salvando..."
                      : `Predestinar ${prize.position}º Prêmio`}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {prizes.length === 0 && (
          <div className="text-gray-500 text-center py-12">
            Nenhum prêmio cadastrado
          </div>
        )}
      </div>
    </div>
  );
}
