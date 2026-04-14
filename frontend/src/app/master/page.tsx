"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "@/lib/api-master";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

function ResetButton({ raffleId }: { raffleId?: string }) {
  const [showModal, setShowModal] = useState(false);
  const [confirm, setConfirm] = useState("");
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: () => masterApi.resetAll(raffleId!),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowModal(false);
      setConfirm("");
    },
  });

  if (!raffleId) return null;

  return (
    <>
      <div className="bg-gray-900 rounded-xl p-6 border border-red-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Reset Total</h2>
            <p className="text-gray-500 text-sm mt-1">Zera tudo: compras, números, compradores, sorteios</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-semibold px-4 py-2 rounded-lg border border-red-600/30"
          >
            Resetar Tudo
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full space-y-4 border border-red-600/50" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-400">Resetar TUDO?</h3>
            <p className="text-gray-400 text-sm">
              Isso vai apagar todas as compras, todos os compradores, resetar todos os números para disponível, e zerar todos os sorteios. Não pode ser desfeito.
            </p>
            <div>
              <p className="text-gray-500 text-xs mb-2">Digite <strong className="text-red-400">RESETAR</strong> para confirmar:</p>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
                placeholder="RESETAR"
              />
            </div>
            {resetMutation.error && (
              <p className="text-red-400 text-sm">{resetMutation.error instanceof Error ? resetMutation.error.message : "Erro"}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => resetMutation.mutate()}
                disabled={confirm !== "RESETAR" || resetMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white font-bold py-3 rounded-lg"
              >
                {resetMutation.isPending ? "Resetando..." : "Confirmar Reset"}
              </button>
              <button
                onClick={() => { setShowModal(false); setConfirm(""); }}
                className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function MasterDashboardPage() {
  const queryClient = useQueryClient();

  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["master-dashboard", raffle?.id],
    queryFn: () => masterApi.dashboard(raffle!.id),
    enabled: !!raffle?.id,
  });

  const { data: creds } = useQuery({
    queryKey: ["master-credentials"],
    queryFn: () => masterApi.getCredentials(),
  });

  const [showCreds, setShowCreds] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [form, setForm] = useState({
    paradiseASecret: "",
    paradiseBSecret: "",
  });

  const credsMutation = useMutation({
    mutationFn: () => masterApi.updateCredentials({
      paradiseAApiKey: "",
      paradiseASecret: form.paradiseASecret,
      paradiseAWebhookSecret: "",
      paradiseBApiKey: "",
      paradiseBSecret: form.paradiseBSecret,
      paradiseBWebhookSecret: "",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-credentials"] });
      setShowCreds(false);
      setForm({
        paradiseASecret: "",
        paradiseBSecret: "",
      });
    },
  });

  function handleFormChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (isLoading || !dashboard) {
    return (
      <div className="text-gray-400 text-center py-20">Carregando...</div>
    );
  }

  const stats = [
    { label: "Total REAL Vendidos", value: String(dashboard.totalSold) },
    {
      label: "Arrecadacao BRUTA",
      value: formatCurrency(dashboard.totalRevenue),
    },
    { label: "Total Compras", value: String(dashboard.totalPurchases) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-red-400">Dashboard Real</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 rounded-xl p-6 border border-red-900/30"
          >
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 border border-green-900/30">
          <h2 className="text-lg font-semibold text-green-400 mb-4">
            NOSSO (Paradise A)
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Receita</p>
              <p className="text-xl font-bold text-green-300">
                {formatCurrency(dashboard.split.ours.revenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Compras</p>
              <p className="text-xl font-bold text-green-300">
                {dashboard.split.ours.purchases}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-blue-900/30">
          <h2 className="text-lg font-semibold text-blue-400 mb-4">
            DONO (Paradise B)
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Receita</p>
              <p className="text-xl font-bold text-blue-300">
                {formatCurrency(dashboard.split.owner.revenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Compras</p>
              <p className="text-xl font-bold text-blue-300">
                {dashboard.split.owner.purchases}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset total */}
      <ResetButton raffleId={raffle?.id} />

      {/* Credenciais Paradise */}
      <div className="bg-gray-900 rounded-xl p-6 border border-red-900/30 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Credenciais Paradise</h2>
            <p className="text-sm text-gray-500 mt-1">
              API Keys e Secrets dos gateways de pagamento (A e B)
            </p>
          </div>
          <div className="flex items-center gap-3">
            {creds && (
              <div className="flex gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  creds.paradiseA.configured
                    ? "bg-green-400/10 text-green-400"
                    : "bg-red-400/10 text-red-400"
                }`}>
                  A: {creds.paradiseA.configured ? "OK" : "Pendente"}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  creds.paradiseB.configured
                    ? "bg-green-400/10 text-green-400"
                    : "bg-red-400/10 text-red-400"
                }`}>
                  B: {creds.paradiseB.configured ? "OK" : "Pendente"}
                </span>
              </div>
            )}
            <button
              onClick={() => setShowCreds(!showCreds)}
              className="text-sm text-red-400 hover:text-red-300 font-medium"
            >
              {showCreds ? "Fechar" : "Configurar"}
            </button>
          </div>
        </div>

        {showCreds && (
          <form
            onSubmit={(e) => { e.preventDefault(); credsMutation.mutate(); }}
            className="space-y-5 pt-2"
          >
            {/* Webhook URL */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
              <label className="block text-xs text-gray-400 font-medium">URL do Webhook (copie e cole na Paradise)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin.replace(":3000", ":3001") : ""}/api/webhook/paradise`}
                  className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-green-400 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin.replace(":3000", ":3001")}/api/webhook/paradise`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
                >
                  Copiar
                </button>
              </div>
              <p className="text-gray-500 text-[11px]">Cole esta URL no campo &quot;Postback URL&quot; ou &quot;Webhook&quot; do painel Paradise.</p>
            </div>

            {/* Paradise A */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-green-400">Paradise A (Nosso)</h3>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Secret Key</label>
                <input
                  type={showSecrets ? "text" : "password"}
                  value={form.paradiseASecret}
                  onChange={(e) => handleFormChange("paradiseASecret", e.target.value)}
                  placeholder={creds?.paradiseA.configured ? "••••••••  (configurado)" : "Secret Key da conta A"}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Paradise B */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-blue-400">Paradise B (Dono)</h3>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Secret Key</label>
                <input
                  type={showSecrets ? "text" : "password"}
                  value={form.paradiseBSecret}
                  onChange={(e) => handleFormChange("paradiseBSecret", e.target.value)}
                  placeholder={creds?.paradiseB.configured ? "••••••••  (configurado)" : "Secret Key da conta B"}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                {showSecrets ? "Ocultar secrets" : "Mostrar secrets"}
              </button>

              <button
                type="submit"
                disabled={credsMutation.isPending || !form.paradiseASecret || !form.paradiseBSecret}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                {credsMutation.isPending ? "Salvando..." : "Salvar Credenciais"}
              </button>
            </div>

            {credsMutation.error && (
              <p className="text-red-400 text-sm">
                {credsMutation.error instanceof Error ? credsMutation.error.message : "Erro ao salvar"}
              </p>
            )}
            {credsMutation.isSuccess && (
              <p className="text-green-400 text-sm">Credenciais salvas com sucesso!</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
