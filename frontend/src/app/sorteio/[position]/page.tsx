"use client";
import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SlotMachine } from "@/components/draw/SlotMachine";
import { Confetti } from "@/components/draw/Confetti";
import { WinnerReveal } from "@/components/draw/WinnerReveal";

type DrawPhase = "pending" | "spinning" | "revealed";

export default function DrawPage() {
  const params = useParams<{ position: string }>();
  const position = Number(params.position);
  const [phase, setPhase] = useState<DrawPhase>("pending");

  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const { data: drawData } = useQuery({
    queryKey: ["draw", position],
    queryFn: () => api.getDrawData(raffle!.id, position),
    enabled: !!raffle,
    refetchInterval: phase === "pending" ? 3000 : false,
  });

  const prize = raffle?.prizes.find((p) => p.position === position);
  const winnerNumber = drawData?.winnerNumber ?? null;
  const winnerName = drawData?.winnerName ?? "Ganhador";
  const drawStatus = drawData?.status;

  useEffect(() => {
    if (phase !== "pending") return;
    if (drawStatus === "drawn" && winnerNumber !== null) {
      setPhase("spinning");
    }
    if (drawStatus === "animating") {
      setPhase("spinning");
    }
  }, [phase, drawStatus, winnerNumber]);

  const handleSlotComplete = useCallback(() => {
    setPhase("revealed");
  }, []);

  if (!raffle) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-xl">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            {raffle.name}
          </h1>
          {prize && (
            <p className="text-lg text-gray-400">
              {position}o Premio - {prize.name}
            </p>
          )}
        </div>

        {phase === "pending" && (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-500">
              Sorteio ainda nao iniciado
            </p>
            <p className="text-gray-600 mt-2">
              Aguardando o inicio do sorteio...
            </p>
          </div>
        )}

        {phase === "spinning" && winnerNumber !== null && (
          <SlotMachine
            targetNumber={winnerNumber}
            onComplete={handleSlotComplete}
          />
        )}

        {phase === "revealed" && winnerNumber !== null && prize && (
          <>
            <Confetti />
            <WinnerReveal
              number={winnerNumber}
              winnerName={winnerName}
              prizeName={prize.name}
              position={position}
            />
          </>
        )}
      </div>
    </div>
  );
}
