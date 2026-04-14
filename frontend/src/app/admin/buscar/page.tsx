"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { padNumber } from "@/lib/format";

export default function AdminBuscarPage() {
  const [search, setSearch] = useState("");
  const [searched, setSearched] = useState(false);

  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const numberValue = parseInt(search, 10);
  const isValid = !isNaN(numberValue) && numberValue >= 1 && numberValue <= 1000000;

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ["admin-search-number", numberValue],
    queryFn: () => api.adminSearchNumber(raffle!.id, numberValue),
    enabled: false,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !raffle) return;
    setSearched(true);
    refetch();
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: "Disponível", color: "bg-gray-100 text-gray-600" },
    RESERVED: { label: "Reservado", color: "bg-yellow-100 text-yellow-700" },
    SOLD: { label: "Vendido", color: "bg-green-100 text-green-700" },
    NOT_FOUND: { label: "Não encontrado", color: "bg-red-100 text-red-600" },
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-white">Buscar Número</h1>
      <p className="text-sm text-gray-400">
        Consulte o dono de um número da rifa.
      </p>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={1000000}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSearched(false); }}
          placeholder="Digite o número"
          className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          {isLoading ? "..." : "Buscar"}
        </button>
      </form>

      {searched && result && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-indigo-400 font-mono text-3xl font-bold">
              {padNumber(result.numberValue)}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusMap[result.status]?.color ?? "bg-gray-100 text-gray-600"}`}>
              {statusMap[result.status]?.label ?? result.status}
            </span>
          </div>

          {result.buyerName ? (
            <div className="space-y-2 pt-2 border-t border-gray-700">
              <div>
                <p className="text-xs text-gray-500">Nome</p>
                <p className="text-white font-medium">{result.buyerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Telefone</p>
                <p className="text-white font-medium">{result.buyerPhone}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm pt-2 border-t border-gray-700">
              {result.status === "AVAILABLE"
                ? "Este número ainda não foi comprado."
                : "Sem comprador associado."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
