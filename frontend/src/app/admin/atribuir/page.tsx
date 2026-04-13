"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { padNumber } from "@/lib/format";

interface AssignResult {
  numberValue: number;
  buyerName: string;
  buyerPhone: string;
}

export default function AdminAtribuirPage() {
  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const [numberValue, setNumberValue] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [history, setHistory] = useState<AssignResult[]>([]);

  const mutation = useMutation({
    mutationFn: (data: {
      raffleId: string;
      numberValue: number;
      buyerName: string;
      buyerPhone: string;
    }) => api.adminAssignNumber(data),
    onSuccess: (result) => {
      setHistory((prev) => [result, ...prev]);
      setNumberValue("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raffle) return;
    const num = parseInt(numberValue, 10);
    if (isNaN(num) || num < 1) return;
    mutation.mutate({
      raffleId: raffle.id,
      numberValue: num,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.replace(/\D/g, ""),
    });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Atribuir Números</h1>
      <p className="text-sm text-gray-400">
        Atribua manualmente um número da rifa a um cliente.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-5"
      >
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
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
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
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {mutation.error && (
          <p className="text-red-400 text-sm">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Erro ao atribuir"}
          </p>
        )}

        <button
          type="submit"
          disabled={
            mutation.isPending ||
            !numberValue ||
            !buyerName.trim() ||
            !buyerPhone.replace(/\D/g, "")
          }
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {mutation.isPending ? "Atribuindo..." : "Atribuir Número"}
        </button>
      </form>

      {history.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              Atribuídos nesta sessão
            </h2>
          </div>
          <div className="divide-y divide-gray-700/50">
            {history.map((item, i) => (
              <div
                key={i}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div>
                  <span className="text-indigo-400 font-mono text-sm font-bold">
                    {padNumber(item.numberValue)}
                  </span>
                  <span className="text-gray-400 mx-2">→</span>
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
