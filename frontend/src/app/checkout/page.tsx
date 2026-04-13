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
  const { selectedNumbers, clear } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const numbers = Array.from(selectedNumbers).sort((a, b) => a - b);

  if (numbers.length === 0 && !purchaseResult) {
    router.replace("/");
    return null;
  }

  const totalAmount = raffle
    ? numbers.length * raffle.numberPrice
    : 0;

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
    <div className="min-h-screen bg-gray-950 py-6">
      <div className="max-w-lg mx-auto px-4 space-y-6">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          &larr; Voltar
        </button>

        <h1 className="text-2xl font-bold text-white">Finalizar Compra</h1>

        {!purchaseResult && (
          <>
            <div className="bg-gray-800 rounded-xl p-4 space-y-3">
              <h2 className="text-white font-medium">Numeros selecionados</h2>
              <div className="flex flex-wrap gap-2">
                {numbers.map((n) => (
                  <span
                    key={n}
                    className="bg-green-500/20 text-green-400 text-xs font-mono px-2 py-1 rounded"
                  >
                    {padNumber(n)}
                  </span>
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-700">
                <span className="text-gray-400">
                  {numbers.length} {numbers.length === 1 ? "numero" : "numeros"}
                </span>
                <span className="text-green-400 font-bold">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-gray-800 rounded-xl p-4">
              <h2 className="text-white font-medium mb-4">Seus dados</h2>
              <BuyerForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </>
        )}

        {purchaseResult && (
          <div className="bg-gray-800 rounded-xl p-6">
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
