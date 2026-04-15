"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/hooks/useCart";
import { api } from "@/lib/api";
import { formatCurrency, padNumber } from "@/lib/format";
import { BuyerForm } from "@/components/checkout/BuyerForm";
import { PixPayment } from "@/components/checkout/PixPayment";
import type { PurchaseResult } from "@/types";

export default function CheckoutPage() {
  const router = useRouter();
  const selectedNumbers = useCart((s) => s.selectedNumbers);
  const clear = useCart((s) => s.clear);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  // Pre-purchase geolocation check — detects state from IP before showing form
  const { data: geoData, isLoading: geoLoading } = useQuery({
    queryKey: ["geo-check"],
    queryFn: () => api.geoCheck(),
    staleTime: 60_000,
    retry: false,
  });

  const numbers = [...selectedNumbers].sort((a, b) => a - b);

  if (numbers.length === 0 && !purchaseResult) {
    router.replace("/");
    return null;
  }

  // Wait for geolocation before showing form (max ~3s, then falls through)
  if (geoLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Preparando checkout...</p>
        </div>
      </div>
    );
  }

  const totalAmount = raffle ? numbers.length * raffle.numberPrice : 0;

  async function handleSubmit(data: {
    buyerName: string;
    buyerCpf: string;
    buyerPhone: string;
    buyerEmail: string;
  }) {
    if (!raffle) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.createPurchase({
        raffleId: raffle.id,
        buyerName: data.buyerName,
        buyerCpf: data.buyerCpf,
        buyerPhone: data.buyerPhone,
        buyerEmail: data.buyerEmail,
        numbers,
      });
      setPurchaseResult(result);
      clear();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao processar compra";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white py-6">
      <div className="max-w-lg mx-auto px-5 space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors text-sm"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900">
          Finalizar Compra
        </h1>

        {!purchaseResult && (
          <>
            <div className="card p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">
                  {numbers.length} números
                </span>
                <span className="text-xl font-black text-green-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {error && (
              <div className="card p-4 border-red-200 bg-red-50">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="card p-4">
              <h2 className="text-gray-900 font-medium text-sm mb-4">
                Seus dados
              </h2>
              <BuyerForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </>
        )}

        {purchaseResult && (
          <div className="card p-6">
            <PixPayment
              qrCode={purchaseResult.qrCode}
              qrCodeText={purchaseResult.qrCodeText}
              amount={purchaseResult.totalAmount}
              purchaseId={purchaseResult.purchaseId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
