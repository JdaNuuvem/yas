"use client";

import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/format";
import { useRouter } from "next/navigation";

export function Cart() {
  const { selectedNumbers, clear } = useCart();
  const router = useRouter();
  const count = selectedNumbers.size;
  const total = count * 0.2;
  const minMet = total >= 5;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <span className="text-white font-bold">{count} numeros</span>
          <span className="text-gray-400 ml-2">|</span>
          <span className="text-green-400 font-bold ml-2">
            {formatCurrency(total)}
          </span>
          {!minMet && (
            <span className="text-yellow-400 text-sm ml-2">
              (minimo R$ 5,00)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={clear}
            className="px-4 py-2 bg-gray-700 rounded text-white"
          >
            Limpar
          </button>
          <button
            disabled={!minMet}
            onClick={() => router.push("/checkout")}
            className="px-6 py-2 bg-green-600 rounded text-white font-bold disabled:opacity-50"
          >
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}
