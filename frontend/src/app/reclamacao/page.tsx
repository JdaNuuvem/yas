"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export default function ReclamacaoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReclamacaoForm />
    </Suspense>
  );
}

function ReclamacaoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const purchaseId = searchParams.get("purchaseId") ?? "";
  const transactionId = searchParams.get("transactionId") ?? "";
  const initialQty = Number(searchParams.get("qty")) || 0;

  const [form, setForm] = useState({
    name: "",
    cpf: "",
    phone: "",
    codesQuantity: initialQty || 1,
    description: "",
  });
  const [proofImage, setProofImage] = useState<string | undefined>();
  const [proofName, setProofName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Imagem deve ter no máximo 10MB");
      return;
    }
    setProofName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await api.createComplaint({
        purchaseId: purchaseId || undefined,
        transactionId: transactionId || undefined,
        name: form.name,
        cpf: form.cpf,
        phone: form.phone,
        codesQuantity: form.codesQuantity,
        description: form.description,
        proofImage,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar reclamação");
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-5">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <svg width="32" height="32" fill="none" stroke="#2d6a4f" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Reclamação enviada!</h2>
          <p className="text-gray-500 text-sm">
            Recebemos sua reclamação e vamos analisar o mais rápido possível.
            Entraremos em contato pelo telefone informado.
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn-primary w-full py-3"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-6">
      <div className="max-w-lg mx-auto px-5 space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors text-sm"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900">
          Relatar Problema
        </h1>

        {(purchaseId || transactionId) && (
          <div className="card p-4 bg-gray-50 space-y-1">
            {purchaseId && (
              <p className="text-xs text-gray-500">
                ID da compra: <span className="font-mono text-gray-700">{purchaseId}</span>
              </p>
            )}
            {transactionId && (
              <p className="text-xs text-gray-500">
                Transação: <span className="font-mono text-gray-700">{transactionId}</span>
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="card p-4 border-red-200 bg-red-50">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card p-4 space-y-4">
            <h2 className="text-gray-900 font-medium text-sm">Seus dados</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome completo</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">CPF</label>
              <input
                type="text"
                required
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Telefone usado na compra</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Quantidade de códigos</label>
              <input
                type="number"
                required
                min={1}
                value={form.codesQuantity}
                onChange={(e) => setForm({ ...form, codesQuantity: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="card p-4 space-y-4">
            <h2 className="text-gray-900 font-medium text-sm">Detalhes do problema</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">O que aconteceu?</label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                placeholder="Descreva o problema que você teve..."
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Comprovante (foto)</label>
              <label className="flex items-center justify-center w-full py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-green-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {proofName ? (
                  <span className="text-sm text-green-600">{proofName}</span>
                ) : (
                  <span className="text-sm text-gray-400">Clique para enviar foto</span>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3.5 text-sm disabled:opacity-50"
          >
            {isLoading ? "Enviando..." : "Enviar reclamação"}
          </button>
        </form>
      </div>
    </div>
  );
}
