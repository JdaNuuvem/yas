"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { HeroSection } from "@/components/raffle/HeroSection";
import { PrizeList } from "@/components/raffle/PrizeList";
import { PrizeTable } from "@/components/raffle/PrizeTable";
import { QuantitySelector } from "@/components/raffle/QuantitySelector";
import { RecentBuyers } from "@/components/raffle/RecentBuyers";
import { TopBuyers } from "@/components/raffle/TopBuyers";
import { MyNumbers } from "@/components/raffle/MyNumbers";
import { Regulation } from "@/components/raffle/Regulation";
import { WhatsAppButton } from "@/components/raffle/WhatsAppButton";
import { Footer } from "@/components/raffle/Footer";
import { Cart } from "@/components/raffle/Cart";
import { AgeGate } from "@/components/raffle/AgeGate";
import { MilestoneProgress } from "@/components/raffle/MilestoneProgress";
import { useCart } from "@/hooks/useCart";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

export default function Home() {
  const {
    data: raffle,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const setPricePerNumber = useCart((s) => s.setPricePerNumber);

  useEffect(() => {
    if (raffle) {
      setPricePerNumber(raffle.numberPrice);
    }
  }, [raffle, setPricePerNumber]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !raffle) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass rounded-2xl p-6 text-center space-y-3 max-w-sm">
          <p className="text-red-400 font-medium">
            Erro ao carregar a rifa
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-[#6c5ce7] text-white text-sm font-bold"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <AgeGate>
    <div className="min-h-screen pb-28">
      <div className="max-w-lg mx-auto space-y-6">
        <HeroSection raffle={raffle} soldCount={raffle.soldCount} />

        <AnimatedSection delay={0.1}>
          <MyNumbers />
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <QuantitySelector
            raffleId={raffle.id}
            pricePerNumber={raffle.numberPrice}
            minPurchase={raffle.minPurchase}
          />
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <MilestoneProgress raffleId={raffle.id} prizes={raffle.prizes} />
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <Regulation />
        </AnimatedSection>

        <AnimatedSection>
          <PrizeList prizes={raffle.prizes} />
        </AnimatedSection>

        <AnimatedSection>
          <PrizeTable prizes={raffle.prizes} raffleId={raffle.id} />
        </AnimatedSection>

        <AnimatedSection>
          <RecentBuyers raffleId={raffle.id} />
        </AnimatedSection>

        <AnimatedSection>
          <TopBuyers raffleId={raffle.id} />
        </AnimatedSection>

        <AnimatedSection>
          <Footer />
        </AnimatedSection>
      </div>

      <Cart
        raffleId={raffle.id}
        pricePerNumber={raffle.numberPrice}
        minPurchase={raffle.minPurchase}
      />
    </div>
    </AgeGate>
  );
}
