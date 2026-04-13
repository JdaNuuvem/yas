"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function AdminDashboardPage() {
  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["admin-dashboard", raffle?.id],
    queryFn: () => api.adminDashboard(raffle!.id),
    enabled: !!raffle?.id,
  });

  if (isLoading || !dashboard) {
    return (
      <div className="text-gray-400 text-center py-20">Carregando...</div>
    );
  }

  const stats = [
    { label: "Numeros Vendidos", value: String(dashboard.totalSold) },
    { label: "Arrecadado", value: formatCurrency(dashboard.totalRevenue) },
    { label: "Compras", value: String(dashboard.totalPurchases) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Vendas Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-6 py-3 font-medium">Comprador</th>
                <th className="text-left px-6 py-3 font-medium">Qtd</th>
                <th className="text-left px-6 py-3 font-medium">Valor</th>
                <th className="text-left px-6 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentPurchases.map((purchase) => (
                <tr
                  key={purchase.id}
                  className="border-b border-gray-700/50 text-gray-300"
                >
                  <td className="px-6 py-3">{purchase.buyerName}</td>
                  <td className="px-6 py-3">{purchase.quantity}</td>
                  <td className="px-6 py-3">
                    {formatCurrency(purchase.totalAmount)}
                  </td>
                  <td className="px-6 py-3">
                    {new Date(purchase.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {dashboard.recentPurchases.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhuma venda registrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
