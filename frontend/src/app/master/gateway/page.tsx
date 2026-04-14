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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-red-400">Gateway Management</h1>

      {/* Split toggle */}
      <div className="bg-gray-900 rounded-xl p-6 border border-red-900/30 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Split de Receita</h2>
            <p className="text-gray-500 text-sm mt-1">
              {splitActive
                ? "Ativo — compras alternam entre conta A (nossa) e B (dono)"
                : "Desativado — todas as compras vão para conta B (dono)"}
            </p>
          </div>
          <button
            onClick={() => splitMutation.mutate(!splitActive)}
            disabled={splitMutation.isPending}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
              splitActive ? "bg-green-500" : "bg-gray-700"
            }`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${
              splitActive ? "translate-x-7" : "translate-x-0.5"
            }`} />
          </button>
        </div>
        <div className={`text-center py-2 rounded-lg text-sm font-bold ${
          splitActive ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
        }`}>
          {splitActive ? "SPLIT ATIVO — 50/50" : "SPLIT DESATIVADO — 100% DONO"}
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
