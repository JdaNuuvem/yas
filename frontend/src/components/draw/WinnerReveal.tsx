"use client";
import { motion } from "framer-motion";
import { padNumber } from "@/lib/format";

interface WinnerRevealProps {
  number: number;
  winnerName: string;
  prizeName: string;
  position: number;
}

export function WinnerReveal({
  number,
  winnerName,
  prizeName,
  position,
}: WinnerRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-6"
    >
      <h2 className="text-4xl font-bold text-yellow-400">PARABENS!</h2>
      <div className="bg-gray-800 rounded-2xl p-8 space-y-4 border border-yellow-500/30">
        <p className="text-gray-400">{position}o Premio</p>
        <p className="text-3xl font-bold text-white">{prizeName}</p>
        <div className="py-4">
          <p className="text-gray-400 text-sm">Numero sorteado</p>
          <p className="text-6xl font-mono font-bold text-green-400">
            {padNumber(number)}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Ganhador(a)</p>
          <p className="text-2xl font-bold text-white">{winnerName}</p>
        </div>
      </div>
    </motion.div>
  );
}
