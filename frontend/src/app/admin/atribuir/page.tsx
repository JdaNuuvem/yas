"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }
  return response.json();
}

export default function AdminAtribuirPage() {
  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const [bulkQty, setBulkQty] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerCpf, setBuyerCpf] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [result, setResult] = useState("");

  const bulkMutation = useMutation({
    mutationFn: (data: { raffleId: string; quantity: number; buyerName: string; buyerCpf: string; buyerPhone: string }) =>
      adminRequest<{ success: boolean; assigned: number; buyerName: string; numbers: number[] }>(
        "/api/admin/assign-bulk",
        { method: "POST", body: JSON.stringify(data) },
      ),
    onSuccess: (res) => {
      setResult(`${res.assigned} números atribuídos a ${res.buyerName}`);
      setBulkQty("");
    },
    onError: (err) => {
      setResult(`Erro: ${err instanceof Error ? err.message : "falha"}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raffle) return;
    const qty = parseInt(bulkQty, 10);
    if (isNaN(qty) || qty < 1) return;
    setResult("");
    bulkMutation.mutate({
      raffleId: raffle.id,
      quantity: qty,
      buyerName: buyerName.trim(),
      buyerCpf: buyerCpf.replace(/\D/g, ""),
      buyerPhone: buyerPhone.replace(/\D/g, ""),
    });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-indigo-400">Atribuir Números em Massa</h1>
      <p className="text-sm text-gray-400">
        Atribua números aleatórios da rifa a um cliente.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 rounded-xl p-6 border border-indigo-900/30 space-y-5"
      >
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
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-gray-600 text-xs mt-1">Números aleatórios serão atribuídos automaticamente</p>
        </div>

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
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {result && (
          <p className={`text-sm ${result.startsWith("Erro") ? "text-red-400" : "text-green-400"}`}>
            {result}
          </p>
        )}

        <button
          type="submit"
          disabled={bulkMutation.isPending || !bulkQty || !buyerName.trim() || !buyerPhone.replace(/\D/g, "")}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {bulkMutation.isPending ? "Atribuindo..." : `Atribuir ${bulkQty || "0"} Números`}
        </button>
      </form>
    </div>
  );
}
