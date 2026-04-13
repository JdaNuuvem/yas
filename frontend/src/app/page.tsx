"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { HeroSection } from "@/components/raffle/HeroSection";
import { PrizeList } from "@/components/raffle/PrizeList";
import { NumberGrid } from "@/components/raffle/NumberGrid";
import { RecentBuyers } from "@/components/raffle/RecentBuyers";
import { TopBuyers } from "@/components/raffle/TopBuyers";
import { Cart } from "@/components/raffle/Cart";

export default function Home() {
  const {
    data: raffle,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Carregando...</div>
      </div>
    );
  }

  if (error || !raffle) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400 text-lg">
          Erro ao carregar a rifa. Tente novamente.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        <HeroSection raffle={raffle} soldCount={0} />
        <PrizeList prizes={raffle.prizes} />
        <NumberGrid raffleId={raffle.id} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RecentBuyers raffleId={raffle.id} />
          <TopBuyers raffleId={raffle.id} />
        </div>
      </div>
      <Cart raffleId={raffle.id} pricePerNumber={raffle.numberPrice} />
    </div>
  );
}
