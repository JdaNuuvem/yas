"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { masterApi } from "@/lib/api-master";
import { padNumber } from "@/lib/format";

interface AssignResult {
  numberValue: number;
  buyerName: string;
  buyerPhone: string;
}

export default function MasterAtribuirPage() {
  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [numberValue, setNumberValue] = useState("");
  const [bulkQty, setBulkQty] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerCpf, setBuyerCpf] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [history, setHistory] = useState<AssignResult[]>([]);

  const mutation = useMutation({
    mutationFn: (data: {
      raffleId: string;
      numberValue: number;
      buyerName: string;
      buyerCpf: string;
      buyerPhone: string;
    }) => masterApi.assignNumber(data),
    onSuccess: (result) => {
      setHistory((prev) => [result, ...prev]);
      setNumberValue("");
    },
  });

  const [bulkResult, setBulkResult] = useState("");

  const bulkMutation = useMutation({
    mutationFn: (data: { raffleId: string; quantity: number; buyerName: string; buyerCpf: string; buyerPhone: string }) =>
      masterApi.assignBulk(data),
    onSuccess: (result) => {
      setBulkResult(`${result.assigned} números atribuídos a ${result.buyerName}`);
      setBulkQty("");
    },
    onError: (err) => {
      setBulkResult(`Erro: ${err instanceof Error ? err.message : "falha"}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raffle) return;
    if (mode === "bulk") {
      const qty = parseInt(bulkQty, 10);
      if (isNaN(qty) || qty < 1) return;
      bulkMutation.mutate({
        raffleId: raffle.id,
        quantity: qty,
        buyerName: buyerName.trim(),
        buyerCpf: buyerCpf.replace(/\D/g, ""),
        buyerPhone: buyerPhone.replace(/\D/g, ""),
      });
      return;
    }
    const num = parseInt(numberValue, 10);
    if (isNaN(num) || num < 1) return;
    mutation.mutate({
      raffleId: raffle.id,
      numberValue: num,
      buyerName: buyerName.trim(),
      buyerCpf: buyerCpf.replace(/\D/g, ""),
      buyerPhone: buyerPhone.replace(/\D/g, ""),
    });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-red-400">Atribuir Números</h1>
      <p className="text-sm text-gray-400">
        Atribua números da rifa a um cliente — individual ou em massa.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mode === "single" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400"}`}
        >
          Número Único
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mode === "bulk" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400"}`}
        >
          Em Massa
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 rounded-xl p-6 border border-red-900/30 space-y-5"
      >
        {mode === "single" ? (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Número da Cota
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1000000}
              value={numberValue}
              onChange={(e) => setNumberValue(e.target.value.slice(0, 7))}
              placeholder="Ex: 12345"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Quantidade de Números
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={10000}
              value={bulkQty}
              onChange={(e) => setBulkQty(e.target.value)}
              placeholder="Ex: 500"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="text-gray-600 text-xs mt-1">Números aleatórios serão atribuídos automaticamente</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Nome do Cliente
          </label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value.slice(0, 100))}
            placeholder="Nome completo"
            maxLength={100}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            CPF
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={buyerCpf}
            onChange={(e) => setBuyerCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
            placeholder="00000000000"
            maxLength={11}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Telefone / WhatsApp
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
            placeholder="11999998888"
            maxLength={11}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {mutation.error && (
          <p className="text-red-400 text-sm">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Erro ao atribuir"}
          </p>
        )}

        {bulkResult && mode === "bulk" && (
          <p className={`text-sm ${bulkResult.startsWith("Erro") ? "text-red-400" : "text-green-400"}`}>
            {bulkResult}
          </p>
        )}

        <button
          type="submit"
          disabled={
            (mode === "single" ? (mutation.isPending || !numberValue) : (bulkMutation.isPending || !bulkQty)) ||
            !buyerName.trim() ||
            !buyerPhone.replace(/\D/g, "")
          }
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {mode === "single"
            ? (mutation.isPending ? "Atribuindo..." : "Atribuir Número")
            : (bulkMutation.isPending ? "Atribuindo..." : `Atribuir ${bulkQty || "0"} Números`)}
        </button>
      </form>

      {history.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-red-900/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-900/30">
            <h2 className="text-lg font-semibold text-white">
              Atribuídos nesta sessão
            </h2>
          </div>
          <div className="divide-y divide-gray-800">
            {history.map((item, i) => (
              <div
                key={i}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div>
                  <span className="text-red-400 font-mono text-sm font-bold">
                    {padNumber(item.numberValue)}
                  </span>
                  <span className="text-gray-500 mx-2">→</span>
                  <span className="text-white text-sm">{item.buyerName}</span>
                </div>
                <span className="text-gray-500 text-xs">{item.buyerPhone}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
