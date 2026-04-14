"use client";
import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { SlotMachine } from "@/components/draw/SlotMachine";
import { Confetti } from "@/components/draw/Confetti";
import { WinnerReveal } from "@/components/draw/WinnerReveal";

type DrawPhase = "waiting" | "ready" | "spinning" | "revealed";

export default function DrawPage() {
  const params = useParams<{ position: string }>();
  const position = Number(params.position);
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<DrawPhase>("waiting");

  const { data: raffle } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api.getRaffle(),
  });

  const { data: drawData } = useQuery({
    queryKey: ["draw", position],
    queryFn: () => api.getDrawData(raffle!.id, position),
    enabled: !!raffle,
    refetchInterval: phase === "waiting" ? 3000 : false,
  });

  const prize = raffle?.prizes.find((p) => p.position === position);
  const winnerNumber = drawData?.winnerNumber ?? null;
  const winnerName = drawData?.winnerName ?? "Ganhador";
  const drawStatus = drawData?.status;

  useEffect(() => {
    if (phase !== "waiting") return;
    if ((drawStatus === "drawn" || drawStatus === "animating") && winnerNumber !== null) {
      setPhase("ready");
    }
  }, [phase, drawStatus, winnerNumber]);

  const handleStart = useCallback(() => {
    setPhase("spinning");
  }, []);

  const handleSlotComplete = useCallback(() => {
    setPhase("revealed");
  }, []);

  if (!raffle) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {raffle.name}
          </h1>
          {prize && (
            <p className="text-base sm:text-lg text-gray-400">
              {position}º Prêmio — {prize.name}
            </p>
          )}
        </div>

        {/* Waiting for draw to be triggered */}
        {phase === "waiting" && (
          <div className="text-center py-16 space-y-4">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <p className="text-xl sm:text-2xl text-gray-500 font-medium">
                Aguardando sorteio...
              </p>
            </motion.div>
            <p className="text-gray-600 text-sm">
              O sorteio será iniciado em instantes
            </p>
          </div>
        )}

        {/* Ready — show big START button */}
        {phase === "ready" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-8">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-yellow-400 text-lg font-bold text-center"
            >
              Pronto para sortear!
            </motion.p>
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
              className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/30 active:shadow-yellow-500/50"
            >
              <span className="text-black text-2xl sm:text-3xl font-black uppercase tracking-wider">
                Sortear
              </span>
            </motion.button>
            <p className="text-gray-600 text-xs text-center">
              Toque para iniciar a animação
            </p>
          </div>
        )}

        {/* Spinning animation */}
        {phase === "spinning" && winnerNumber !== null && (
          <SlotMachine
            targetNumber={winnerNumber}
            onComplete={handleSlotComplete}
          />
        )}

        {/* Winner revealed */}
        {phase === "revealed" && winnerNumber !== null && prize && (
          <>
            {winnerName !== "Numero nao vendido" && <Confetti />}
            <WinnerReveal
              number={winnerNumber}
              winnerName={winnerName}
              prizeName={prize.name}
              position={position}
            />
            {winnerName === "Numero nao vendido" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center space-y-4"
              >
                <p className="text-red-400 text-sm">
                  Este número não foi vendido. Sorteie novamente.
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setPhase("waiting");
                    queryClient.invalidateQueries({ queryKey: ["draw", position] });
                    // Trigger re-draw on backend
                    api.adminTriggerDraw(raffle.id, position, 0);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-4 rounded-xl text-lg"
                >
                  Sortear Novamente
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
