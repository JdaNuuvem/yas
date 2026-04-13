"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/format";

interface QuantitySelectorProps {
  raffleId: string;
  pricePerNumber: number;
  minPurchase: number;
}

const QUICK_AMOUNTS = [
  { qty: 100, label: null },
  { qty: 200, label: null },
  { qty: 250, label: null },
  { qty: 300, label: null },
  { qty: 500, label: "Popular" },
  { qty: 1000, label: null },
];

export function QuantitySelector({
  raffleId,
  pricePerNumber,
  minPurchase,
}: QuantitySelectorProps) {
  const [customQty, setCustomQty] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const selectedNumbers = useCart((s) => s.selectedNumbers);
  const addMany = useCart((s) => s.addMany);
  const clear = useCart((s) => s.clear);

  const handleSelect = useCallback(
    async (qty: number) => {
      clear();
      setIsLoading(true);
      try {
        const numbers = await api.getRandomNumbers(raffleId, qty);
        addMany(numbers);
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    },
    [raffleId, addMany, clear],
  );

  const increment = () => setCustomQty((q) => Math.min(q + 5, 100000));
  const decrement = () => setCustomQty((q) => Math.max(q - 5, 25));

  const count = selectedNumbers.length;
  const total = count * pricePerNumber;

  return (
    <section className="px-5 space-y-4">
      {/* Price badge */}
      <div className="card p-3 flex items-center justify-between">
        <span className="text-gray-400 text-sm">Por apenas</span>
        <span className="text-xl font-black text-green-600">
          {formatCurrency(pricePerNumber)}
        </span>
      </div>

      {/* Custom qty input with +/- */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={decrement}
          className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-bold active:scale-90 transition-transform border border-gray-200"
        >
          -
        </button>
        <div className="card px-8 py-3 min-w-[100px] text-center">
          <span className="text-2xl font-black text-gray-900">{customQty}</span>
        </div>
        <button
          onClick={increment}
          className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-bold active:scale-90 transition-transform border border-gray-200"
        >
          +
        </button>
      </div>

      {/* Quick amount grid */}
      <div className="grid grid-cols-3 gap-2">
        {QUICK_AMOUNTS.map(({ qty, label }) => (
          <motion.button
            key={qty}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCustomQty((q) => q + qty)}
            disabled={isLoading}
            className={`relative btn-outline p-3 text-center ${
              isLoading ? "opacity-50" : ""
            }`}
          >
            {label && (
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full"
              >
                {label}
              </motion.span>
            )}
            <span className="text-base font-black text-green-600 block">
              +{qty}
            </span>
            <span className="text-[10px] text-gray-400 block">
              Adicionar
            </span>
          </motion.button>
        ))}
      </div>

      {/* Buy button - like reference */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => handleSelect(customQty)}
        disabled={isLoading}
        className="w-full btn-primary p-4 flex items-center justify-between disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          <div className="text-left">
            <span className="block text-sm font-bold">Comprar</span>
            <span className="block text-[11px] opacity-80">
              Garantir meus números
            </span>
          </div>
        </div>
        <span className="text-lg font-black">
          {formatCurrency(customQty * pricePerNumber)}
        </span>
      </motion.button>

      {/* Selected feedback */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="card p-4 text-center space-y-1"
          >
            <p className="text-gray-500 text-sm">
              <span className="text-gray-900 font-bold">
                {count}
              </span>{" "}
              números selecionados
            </p>
            <motion.p
              key={total}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-2xl font-black text-green-600"
            >
              {formatCurrency(total)}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
