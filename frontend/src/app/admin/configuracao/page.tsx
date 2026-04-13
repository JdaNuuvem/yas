"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function AdminConfiguracaoPage() {
  const queryClient = useQueryClient();

  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (raffle) {
      setName(raffle.name);
      setDescription(raffle.description);
    }
  }, [raffle]);

  const mutation = useMutation({
    mutationFn: () => api.updateRaffle(raffle!.id, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="text-gray-400 text-center py-20">Carregando...</div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Configuracao</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Nome da Rifa
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Descricao
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {mutation.error && (
          <p className="text-red-400 text-sm">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Erro ao salvar"}
          </p>
        )}

        {success && (
          <p className="text-green-400 text-sm">Salvo com sucesso!</p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
