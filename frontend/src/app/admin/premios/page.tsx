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

  const [saveError, setSaveError] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      api.adminUpdatePrize(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
      queryClient.refetchQueries({ queryKey: ["raffle"] });
      setEditingId(null);
      setSaveError("");
    },
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
    },
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

  const [showResetModal, setShowResetModal] = useState(false);
  const [drawingPosition, setDrawingPosition] = useState<number | null>(null);

  const drawMutation = useMutation({
    mutationFn: ({ position }: { position: number }) =>
      api.adminTriggerDraw(raffle!.id, position, 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
      queryClient.refetchQueries({ queryKey: ["raffle"] });
      setDrawingPosition(null);
    },
    onError: () => {
      setDrawingPosition(null);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => api.adminResetDraws(raffle!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
      queryClient.refetchQueries({ queryKey: ["raffle"] });
      setShowResetModal(false);
    },
  });

  function saveEdit(id: string) {
    updateMutation.mutate({ id, data: { name: editName, description: editDesc } });
  }

  if (isLoading || !raffle) {
    return <div className="text-gray-400 text-center py-20">Carregando...</div>;
  }

  const sortedPrizes = [...raffle.prizes].sort((a, b) => a.position - b.position);
  const hasDrawn = sortedPrizes.some((p) => p.winnerNumber !== null);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">Prêmios</h1>
        <div className="flex gap-2">
          {hasDrawn && (
            <button
              onClick={() => setShowResetModal(true)}
              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors border border-red-600/30"
            >
              Zerar Sorteios
            </button>
          )}
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
      </div>

      {/* Reset draws modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowResetModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full space-y-4 border border-red-600/30" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">Zerar todos os sorteios?</h3>
            <p className="text-gray-400 text-sm">
              Todos os prêmios sorteados serão resetados e ficarão disponíveis para sortear novamente. Esta ação não pode ser desfeita.
            </p>
            {resetMutation.error && (
              <p className="text-red-400 text-sm">
                {resetMutation.error instanceof Error ? resetMutation.error.message : "Erro"}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {resetMutation.isPending ? "Zerando..." : "Sim, zerar tudo"}
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(prize.id)}
                    disabled={updateMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                  >
                    {updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setSaveError(""); }}
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
                    {prize.drawnAt && prize.winnerName && (
                      <span className="text-green-400 text-xs font-medium">
                        Ganhador: {prize.winnerName}
                      </span>
                    )}
                    {prize.drawnAt && !prize.winnerName && (
                      <span className="text-green-400 text-xs font-medium">Sorteado</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  {!prize.drawnAt && (
                    <button
                      onClick={() => {
                        setDrawingPosition(prize.position);
                        drawMutation.mutate({ position: prize.position });
                      }}
                      disabled={drawingPosition === prize.position}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {drawingPosition === prize.position ? "Sorteando..." : "Revelar Ganhador"}
                    </button>
                  )}
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
