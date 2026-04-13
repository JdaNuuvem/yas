"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/format";
import { useRouter } from "next/navigation";

interface CartProps {
  raffleId: string;
  pricePerNumber: number;
  minPurchase: number;
}

export function Cart({ pricePerNumber, minPurchase }: CartProps) {
  const selectedNumbers = useCart((s) => s.selectedNumbers);
  const clear = useCart((s) => s.clear);
  const router = useRouter();
  const count = selectedNumbers.length;
  const total = count * pricePerNumber;
  const minMet = count >= minPurchase;

  return (
    <AnimatePresence>
      {count === 0 ? null : (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2"
    >
      <div className="card p-4 max-w-lg mx-auto shadow-xl shadow-black/10">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-gray-700 text-sm font-bold">
              {count} números
            </p>
            <p className="text-xl font-black text-green-600">
              {formatCurrency(total)}
            </p>
            {!minMet && (
              <p className="text-orange-500 text-[11px]">
                Mínimo {minPurchase} números
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={clear}
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
              aria-label="Limpar"
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!minMet}
              onClick={() => router.push("/checkout")}
              className="btn-primary px-6 py-3 disabled:opacity-40"
            >
              Comprar
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
