"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface PrizeRow {
  position: number;
  name: string;
  numberValue: string;
  saved: boolean;
}

export default function MasterSorteioPage() {
  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const [rows, setRows] = useState<PrizeRow[]>(() =>
    Array.from({ length: 10 }, (_, i) => ({
      position: i + 1,
      name: "",
      numberValue: "",
      saved: false,
    })),
  );

  const prizes = raffle?.prizes ?? [];

  const mergedRows = rows.map((row) => {
    const prize = prizes.find((p) => p.position === row.position);
    return {
      ...row,
      name: prize?.name ?? `Premio ${row.position}`,
    };
  });

  const setWinnerMutation = useMutation({
    mutationFn: ({
      position,
      numberValue,
    }: {
      position: number;
      numberValue: number;
    }) => api.masterSetWinner(raffle!.id, position, numberValue),
    onSuccess: (_data, variables) => {
      setRows((prev) =>
        prev.map((r) =>
          r.position === variables.position ? { ...r, saved: true } : r,
        ),
      );
    },
  });

  function handleNumberChange(position: number, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.position === position
          ? { ...r, numberValue: value, saved: false }
          : r,
      ),
    );
  }

  function handleDefine(position: number, numberValue: string) {
    const parsed = parseInt(numberValue, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 1000000) {
      return;
    }
    setWinnerMutation.mutate({ position, numberValue: parsed });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-red-400">Controle de Sorteio</h1>
      <p className="text-sm text-gray-500">
        Defina os numeros vencedores antes do dono clicar em
        &quot;Sortear&quot;.
      </p>

      <div className="space-y-4">
        {mergedRows.map((row) => (
          <div
            key={row.position}
            className="bg-gray-900 rounded-xl p-4 border border-red-900/30 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {row.position}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {row.name}
              </p>
            </div>

            <input
              type="number"
              min={1}
              max={1000000}
              value={row.numberValue}
              onChange={(e) =>
                handleNumberChange(row.position, e.target.value)
              }
              placeholder="Numero"
              className="w-36 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <button
              onClick={() => handleDefine(row.position, row.numberValue)}
              disabled={
                !row.numberValue ||
                !raffle?.id ||
                setWinnerMutation.isPending
              }
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              Definir
            </button>

            {row.saved && (
              <span className="text-green-400 text-sm font-medium shrink-0">
                Salvo!
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
