"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function AdminConfiguraçãoPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Gateway keys
  const [secretKey, setSecretKey] = useState("");
  const [gwSuccess, setGwSuccess] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const { data: gwData } = useQuery({
    queryKey: ["gateway-keys"],
    queryFn: () => api.adminGetGatewayKeys(),
  });

  useEffect(() => {
    if (raffle) {
      setName(raffle.name);
      setDescription(raffle.description);
      setImagePreview(raffle.mainImageUrl);
    }
  }, [raffle]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_SIZE = 30 * 1024 * 1024; // 30MB
    if (file.size > MAX_SIZE) {
      alert("Imagem muito grande. Maximo permitido: 30MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  }

  const raffleMutation = useMutation({
    mutationFn: () =>
      api.updateRaffle(raffle!.id, { name, description, mainImageUrl: imagePreview }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raffle"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const gwMutation = useMutation({
    mutationFn: () => api.adminSaveGatewayKeys(secretKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateway-keys"] });
      setGwSuccess(true);
      setSecretKey("");
      setTimeout(() => setGwSuccess(false), 3000);
    },
  });

  if (isLoading) {
    return <div className="text-gray-400 text-center py-20">Carregando...</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Configuração</h1>

      {/* Raffle settings */}
      <form
        onSubmit={(e) => { e.preventDefault(); raffleMutation.mutate(); }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-5"
      >
        <h2 className="text-lg font-semibold text-white">Dados da Rifa</h2>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Imagem Principal
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full aspect-[16/10] rounded-xl border-2 border-dashed border-gray-600 hover:border-indigo-500 transition-colors cursor-pointer overflow-hidden bg-gray-900 flex items-center justify-center"
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-medium">Trocar imagem</span>
                </div>
              </>
            ) : (
              <div className="text-center space-y-2">
                <svg className="mx-auto text-gray-500" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-sm">Clique para subir uma foto</p>
                <p className="text-gray-600 text-xs">JPG, PNG ou WebP - max 5MB</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
          {imagePreview && (
            <button type="button" onClick={() => setImagePreview(null)} className="mt-2 text-red-400 text-xs hover:text-red-300">
              Remover imagem
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nome da Rifa</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>

        {raffleMutation.error && (
          <p className="text-red-400 text-sm">
            {raffleMutation.error instanceof Error ? raffleMutation.error.message : "Erro ao salvar"}
          </p>
        )}
        {success && <p className="text-green-400 text-sm">Salvo com sucesso!</p>}

        <button type="submit" disabled={raffleMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
          {raffleMutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      </form>

      {/* Gateway keys */}
      <form
        onSubmit={(e) => { e.preventDefault(); gwMutation.mutate(); }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Chaves do Gateway (PIX)</h2>
          {gwData?.hasKeys && (
            <span className="text-green-400 text-xs font-medium bg-green-400/10 px-2.5 py-1 rounded-full">
              Configurado
            </span>
          )}
        </div>

        <p className="text-gray-400 text-sm">
          Insira sua Secret Key do gateway de pagamento Paradise para receber pagamentos PIX.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Secret Key</label>
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder={gwData?.hasKeys ? "••••••••  (já configurado)" : "Insira sua Secret Key"}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-600 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
            >
              {showSecret ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        {gwMutation.error && (
          <p className="text-red-400 text-sm">
            {gwMutation.error instanceof Error ? gwMutation.error.message : "Erro ao salvar"}
          </p>
        )}
        {gwSuccess && <p className="text-green-400 text-sm">Chaves salvas com sucesso!</p>}

        <button
          type="submit"
          disabled={gwMutation.isPending || !secretKey}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {gwMutation.isPending ? "Salvando..." : "Salvar Chaves"}
        </button>
      </form>
    </div>
  );
}
