"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Prize } from "@/types";

export default function AdminPrêmiosPage() {
  const queryClient = useQueryClient();
  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [newPosition, setNewPosition] = useState(1);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["raffle"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      api.adminUpdatePrize(id, data),
    onSuccess: () => { invalidate(); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.adminDeletePrize(id),
    onSuccess: invalidate,
  });

  const createMutation = useMutation({
    mutationFn: (data: { raffleId: string; position: number; name: string; description?: string }) =>
      api.adminCreatePrize(data),
    onSuccess: () => {
      invalidate();
      setShowAdd(false);
      setNewName("");
      setNewDesc("");
    },
  });

  function startEdit(prize: Prize) {
    setEditingId(prize.id);
    setEditName(prize.name);
    setEditDesc(prize.description ?? "");
  }

  function saveEdit(id: string) {
    updateMutation.mutate({ id, data: { name: editName, description: editDesc } });
  }

  if (isLoading || !raffle) {
    return <div className="text-gray-400 text-center py-20">Carregando...</div>;
  }

  const sortedPrizes = [...raffle.prizes].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Prêmios</h1>
        <button
          onClick={() => {
            setNewPosition(sortedPrizes.length + 1);
            setShowAdd(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Adicionar Prêmio
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-800 rounded-xl border border-indigo-500/50 p-5 space-y-4">
          <h2 className="text-white font-semibold">Novo Prêmio</h2>
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Posição</label>
              <input
                type="number"
                min={1}
                value={newPosition}
                onChange={(e) => setNewPosition(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nome</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Moto Honda CG 160"
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descrição</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descrição do prêmio (opcional)"
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white text-sm"
            />
          </div>
          {createMutation.error && (
            <p className="text-red-400 text-sm">
              {createMutation.error instanceof Error ? createMutation.error.message : "Erro ao criar"}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate({ raffleId: raffle.id, position: newPosition, name: newName, description: newDesc || undefined })}
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {createMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-gray-400 hover:text-white text-sm px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sortedPrizes.map((prize) => (
          <div
            key={prize.id}
            className="bg-gray-800 rounded-xl border border-gray-700 p-5"
          >
            {editingId === prize.id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 text-xs font-semibold shrink-0">
                    {prize.position}o
                  </span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descrição"
                  className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(prize.id)}
                    disabled={updateMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                  >
                    {updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-400 hover:text-white text-sm px-4 py-2"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">
                    {prize.position}o
                  </span>
                  <div>
                    <h3 className="text-white font-semibold">{prize.name}</h3>
                    {prize.description && (
                      <p className="text-gray-400 text-sm">{prize.description}</p>
                    )}
                    {prize.drawnAt && (
                      <span className="text-green-400 text-xs font-medium">Sorteado</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(prize)}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-600/10 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover "${prize.name}"?`)) {
                        deleteMutation.mutate(prize.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-600/10 transition-colors disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {sortedPrizes.length === 0 && (
          <div className="text-gray-500 text-center py-12">
            Nenhum prêmio cadastrado
          </div>
        )}
      </div>
    </div>
  );
}
