"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Complaint } from "@/types";

export default function ReclamacoesPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const fetchComplaints = useCallback(async () => {
    try {
      const data = await api.adminGetComplaints("PENDING");
      setComplaints(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  async function handleResolve(id: string) {
    setResolving(id);
    try {
      await api.adminResolveComplaint(id);
      setComplaints((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    } finally {
      setResolving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Reclamações</h1>
        <span className="text-sm text-gray-400">
          {complaints.length} pendente{complaints.length !== 1 ? "s" : ""}
        </span>
      </div>

      {complaints.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <svg width="32" height="32" fill="none" stroke="#6b7280" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Nenhuma reclamação pendente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{c.name}</h3>
                  <p className="text-gray-400 text-xs">
                    {new Date(c.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-medium rounded-lg">
                  Pendente
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs block">Telefone</span>
                  <span className="text-gray-200">{c.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">CPF</span>
                  <span className="text-gray-200">{c.cpf}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Qtd. códigos</span>
                  <span className="text-gray-200">{c.codesQuantity}</span>
                </div>
                {c.transactionId && (
                  <div>
                    <span className="text-gray-500 text-xs block">Transação</span>
                    <span className="text-gray-200 font-mono text-xs">{c.transactionId}</span>
                  </div>
                )}
                {c.purchaseId && (
                  <div className="col-span-2">
                    <span className="text-gray-500 text-xs block">ID da compra</span>
                    <span className="text-gray-200 font-mono text-xs">{c.purchaseId}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <span className="text-gray-500 text-xs block mb-1">Descrição</span>
                <p className="text-gray-300 text-sm bg-gray-800/50 rounded-lg p-3">
                  {c.description}
                </p>
              </div>

              {/* Proof image */}
              {c.proofImage && (
                <div>
                  <span className="text-gray-500 text-xs block mb-1">Comprovante</span>
                  <button
                    onClick={() => setExpandedImage(c.proofImage)}
                    className="block"
                  >
                    <img
                      src={c.proofImage}
                      alt="Comprovante"
                      className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </button>
                </div>
              )}

              {/* Resolve button */}
              <button
                onClick={() => handleResolve(c.id)}
                disabled={resolving === c.id}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {resolving === c.id ? "Resolvendo..." : "Marcar como resolvido"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Image modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Comprovante ampliado"
            className="max-w-full max-h-[90vh] rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
