"use client";

import Image from "next/image";
import type { Raffle } from "@/types";
import { formatCurrency } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface HeroSectionProps {
  raffle: Raffle;
  soldCount: number;
}

export function HeroSection({ raffle, soldCount }: HeroSectionProps) {
  return (
    <section className="w-full bg-gray-800 rounded-2xl overflow-hidden">
      {raffle.mainImageUrl && (
        <div className="relative w-full aspect-video">
          <Image
            src={raffle.mainImageUrl}
            alt={raffle.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          {raffle.name}
        </h1>
        <p className="text-gray-400 text-sm md:text-base">
          {raffle.description}
        </p>
        <div className="flex items-center gap-4">
          <span className="text-green-400 text-xl font-bold">
            {formatCurrency(raffle.numberPrice)}
          </span>
          <span className="text-gray-500 text-sm">por numero</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {soldCount.toLocaleString("pt-BR")} vendidos
            </span>
            <span className="text-gray-400">
              de {raffle.totalNumbers.toLocaleString("pt-BR")}
            </span>
          </div>
          <ProgressBar current={soldCount} total={raffle.totalNumbers} />
        </div>
        {raffle.minPurchase > 1 && (
          <p className="text-yellow-400 text-xs">
            Compra minima: {raffle.minPurchase} numeros
          </p>
        )}
      </div>
    </section>
  );
}
