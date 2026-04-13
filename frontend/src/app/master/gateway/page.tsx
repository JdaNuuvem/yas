"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function MasterGatewayPage() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["master-gateway-status"],
    queryFn: () => api.masterGatewayStatus(),
    refetchInterval: 5000,
  });

  const overrideMutation = useMutation({
    mutationFn: (gateway: "A" | "B") => api.masterOverrideGateway(gateway),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-gateway-status"] });
    },
  });

  if (isLoading || !status) {
    return (
      <div className="text-gray-400 text-center py-20">Carregando...</div>
    );
  }

  const isA = status.activeGateway === "A";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-red-400">Gateway Management</h1>

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
            Paradise {status.activeGateway} {isA ? "(Nosso)" : "(Dono)"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Paradise A</p>
            <span
              className={`text-sm font-medium ${
                status.statusA === "online"
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {status.statusA}
            </span>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Paradise B</p>
            <span
              className={`text-sm font-medium ${
                status.statusB === "online"
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {status.statusB}
            </span>
          </div>
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
