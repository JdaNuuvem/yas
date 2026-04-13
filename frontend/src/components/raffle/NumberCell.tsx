"use client";

import { memo } from "react";
import { padNumber } from "@/lib/format";
import type { RaffleNumber } from "@/types";

interface NumberCellProps {
  number: RaffleNumber;
  isSelected: boolean;
  onToggle: (n: number) => void;
}

export const NumberCell = memo(function NumberCell({
  number,
  isSelected,
  onToggle,
}: NumberCellProps) {
  const isSold = number.status === "SOLD";
  const isReserved = number.status === "RESERVED";
  const isAvailable = number.status === "AVAILABLE";

  return (
    <button
      disabled={isSold || isReserved}
      onClick={() => isAvailable && onToggle(number.numberValue)}
      className={`
        w-full aspect-square flex items-center justify-center text-xs font-mono rounded transition-colors duration-150
        ${isSold ? "bg-red-500/30 text-red-300 cursor-not-allowed" : ""}
        ${isReserved ? "bg-yellow-500/30 text-yellow-300 cursor-not-allowed" : ""}
        ${isSelected ? "bg-green-500 text-white ring-2 ring-green-300" : ""}
        ${isAvailable && !isSelected ? "bg-gray-800 text-gray-400 hover:bg-gray-700 cursor-pointer" : ""}
      `}
    >
      {padNumber(number.numberValue)}
    </button>
  );
});
