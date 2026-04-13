"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function MasterDashboardPage() {
  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["master-dashboard", raffle?.id],
    queryFn: () => api.masterDashboard(raffle!.id),
    enabled: !!raffle?.id,
  });

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
    </div>
  );
}
