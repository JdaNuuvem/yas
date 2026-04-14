"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "@/lib/api-master";

export default function MasterGatewayPage() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["master-gateway-status"],
    queryFn: () => masterApi.gatewayStatus(),
    refetchInterval: 5000,
  });

  const overrideMutation = useMutation({
    mutationFn: (gateway: "A" | "B") => masterApi.overrideGateway(gateway),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-gateway-status"] });
    },
  });

  const splitMutation = useMutation({
    mutationFn: (enabled: boolean) => masterApi.updateSplit(enabled ? 50 : 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-gateway-status"] });
    },
  });

  if (isLoading || !status) {
    return (
      <div className="text-gray-400 text-center py-20">Carregando...</div>
    );
  }

  const isA = status.nextGateway === "A";
  const splitActive = status.splitPercentage > 0;
  const soldA = (status as any).soldA ?? 0;
  const soldB = (status as any).soldB ?? 0;
  const limitA = (status as any).limitA ?? 450000;
  const percentA = Math.min((soldA / limitA) * 100, 100);
  const aReachedLimit = soldA >= limitA;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-red-400">Gateway Management</h1>

      {/* Limit warning */}
      {aReachedLimit && splitActive && (
        <div className="bg-red-600/20 border border-red-500 rounded-xl p-4 space-y-2">
          <p className="text-red-400 font-bold text-lg">ATENÇÃO: Paradise A atingiu 450K!</p>
          <p className="text-gray-300 text-sm">Desative o split agora para todas as compras irem para Paradise B.</p>
        </div>
      )}

      {/* Numbers sold per gateway */}
      <div className="bg-gray-900 rounded-xl p-6 border border-red-900/30 space-y-3">
        <h2 className="text-white font-semibold">Números Vendidos por Gateway</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Paradise A (Nosso)</p>
            <p className="text-2xl font-bold text-green-400">{soldA.toLocaleString("pt-BR")}</p>
            <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
              <div className={`h-2 rounded-full ${percentA >= 90 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${percentA}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{percentA.toFixed(1)}% do limite (450K)</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Paradise B (Dono)</p>
            <p className="text-2xl font-bold text-blue-400">{soldB.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-gray-500 mt-1">Sem limite</p>
          </div>
        </div>
      </div>

      {/* Split toggle */}
      <div className="bg-gray-900 rounded-xl p-6 border border-red-900/30 space-y-4">
        <h2 className="text-white font-semibold">Split de Receita</h2>
        <p className="text-gray-500 text-sm">
          {splitActive
            ? "Ativo — compras alternam entre conta A (nossa) e B (dono)"
            : "Desativado — todas as compras vão para conta B (dono)"}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => splitMutation.mutate(true)}
            disabled={splitMutation.isPending || splitActive}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${
              splitActive
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-green-400 border border-green-900/50 hover:bg-green-900/30"
            } disabled:opacity-70`}
          >
            {splitActive ? "✓ " : ""}Ativar Split (50/50)
          </button>
          <button
            onClick={() => splitMutation.mutate(false)}
            disabled={splitMutation.isPending || !splitActive}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${
              !splitActive
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-red-400 border border-red-900/50 hover:bg-red-900/30"
            } disabled:opacity-70`}
          >
            {!splitActive ? "✓ " : ""}Desativar (100% Dono)
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-red-900/30 space-y-6">
        <div>
          <p className="text-sm text-gray-400 mb-1">Gateway Ativo</p>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
              isA
                ? "bg-green-900/40 text-green-400"
                : "bg-blue-900/40 text-blue-400"
            }`}
          >
            Paradise {status.nextGateway} {isA ? "(Nosso)" : "(Dono)"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Paradise A (Nosso)</p>
            <span className={`text-sm font-medium ${isA ? "text-green-400" : "text-gray-500"}`}>
              {isA ? "Proximo" : "Inativo"}
            </span>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Paradise B (Dono)</p>
            <span className={`text-sm font-medium ${!isA ? "text-blue-400" : "text-gray-500"}`}>
              {!isA ? "Proximo" : "Inativo"}
            </span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Split Atual</p>
          <span className="text-lg font-bold text-white">{status.splitPercentage}%</span>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => overrideMutation.mutate("A")}
            disabled={overrideMutation.isPending}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              isA
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-green-400 border border-green-900/50 hover:bg-green-900/30"
            } disabled:opacity-50`}
          >
            Forcar Paradise A (Nosso)
          </button>

          <button
            onClick={() => overrideMutation.mutate("B")}
            disabled={overrideMutation.isPending}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              !isA
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-blue-400 border border-blue-900/50 hover:bg-blue-900/30"
            } disabled:opacity-50`}
          >
            Forcar Paradise B (Dono)
          </button>
        </div>

        {overrideMutation.isError && (
          <p className="text-red-400 text-sm">
            Erro: {overrideMutation.error instanceof Error
              ? overrideMutation.error.message
              : "Falha ao alterar gateway"}
          </p>
        )}
      </div>
    </div>
  );
}
