"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function AdminCompradoresPage() {
  const [page, setPage] = useState(1);

  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-buyers", raffle?.id, page],
    queryFn: () => api.adminBuyers(raffle!.id, page),
    enabled: !!raffle?.id,
  });

  if (isLoading || !data) {
    return (
      <div className="text-gray-400 text-center py-20">Carregando...</div>
    );
  }

  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Compradores</h1>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-6 py-3 font-medium">Nome</th>
                <th className="text-left px-6 py-3 font-medium">Qtd</th>
                <th className="text-left px-6 py-3 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.buyers.map((buyer) => (
                <tr
                  key={buyer.id}
                  className="border-b border-gray-700/50 text-gray-300"
                >
                  <td className="px-6 py-3">{buyer.buyerName}</td>
                  <td className="px-6 py-3">{buyer.quantity}</td>
                  <td className="px-6 py-3">
                    {formatCurrency(buyer.totalAmount)}
                  </td>
                </tr>
              ))}
              {data.buyers.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhum comprador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            Anterior
          </button>
          <span className="text-gray-400 text-sm px-4">
            Pagina {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            Proxima
          </button>
        </div>
      )}
    </div>
  );
}
