"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { NumberCell } from "./NumberCell";
import { useCart } from "@/hooks/useCart";

interface NumberGridProps {
  raffleId: string;
}

const PAGE_SIZE = 1000;

export function NumberGrid({ raffleId }: NumberGridProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { selectedNumbers, toggle, addMany } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ["numbers", raffleId, page],
    queryFn: () => api.getNumbers(raffleId, page, PAGE_SIZE),
  });

  const handleSearch = useCallback(() => {
    const num = parseInt(search, 10);
    if (num >= 1 && num <= 1000000) {
      setPage(Math.ceil(num / PAGE_SIZE));
    }
  }, [search]);

  const handleRandom = useCallback(async () => {
    const numbers = await api.getRandomNumbers(raffleId, 25);
    addMany(numbers);
  }, [raffleId, addMany]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1000;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar numero..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-indigo-600 rounded-lg text-white"
        >
          Buscar
        </button>
        <button
          onClick={handleRandom}
          className="px-4 py-2 bg-purple-600 rounded-lg text-white"
        >
          Aleatorio 25
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">
          Carregando numeros...
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
          {data?.numbers.map((n) => (
            <NumberCell
              key={n.numberValue}
              number={n}
              isSelected={selectedNumbers.has(n.numberValue)}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50 text-white"
        >
          Anterior
        </button>
        <span className="text-gray-400">
          Pagina {page} de {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50 text-white"
        >
          Proxima
        </button>
      </div>
    </div>
  );
}
