"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { Raffle } from "@/types";
import { formatCurrency } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSoldCount } from "@/hooks/useFakeSoldCount";

interface HeroSectionProps {
  raffle: Raffle;
  soldCount: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function HeroSection({ raffle, soldCount: realCount }: HeroSectionProps) {
  const soldCount = useSoldCount(realCount);
  const hasImage = !!raffle.mainImageUrl;
  const imageUrl = hasImage && raffle.mainImageUrl!.startsWith("/")
    ? `${API_URL}${raffle.mainImageUrl}`
    : raffle.mainImageUrl;

  return (
    <section>
      {/* Image area */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
        {hasImage ? (
          <img
            src={imageUrl!}
            alt={raffle.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
            <span className="text-7xl mb-2">&#x1F3CD;</span>
            <p className="text-gray-400 text-sm">Imagem do premio</p>
          </div>
        )}
      </div>

      {/* Special banner */}
      <div className="bg-green-50 border-b border-green-100 px-4 py-2.5 flex items-center justify-center gap-2">
        <span className="text-green-600 text-sm">&#x2705;</span>
        <span className="text-green-700 text-xs font-medium">
          Você está participando com condições especiais
        </span>
      </div>

      {/* Content */}
      <div className="px-5 pt-5 pb-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">
            Adquira já!
          </p>
          <h1 className="text-2xl font-black text-gray-900 leading-tight">
            {raffle.name}
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="text-gray-500 text-sm leading-relaxed"
        >
          {raffle.description}
        </motion.p>

        {/* Price + live badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="flex items-center justify-between"
        >
          <div>
            <span className="text-gray-400 text-xs block">Por apenas</span>
            <motion.span
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.55 }}
              className="text-3xl font-black text-green-600 block"
            >
              {formatCurrency(raffle.numberPrice)}
            </motion.span>
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600 text-xs font-bold">AO VIVO</span>
          </motion.div>
        </motion.div>

        {/* Fake sold counter */}
        <div className="card p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">
              <span className="text-gray-900 font-bold">
                {soldCount.toLocaleString("pt-BR")}
              </span>{" "}
              vendidos
            </span>
            <span className="text-gray-400">
              de {raffle.totalNumbers.toLocaleString("pt-BR")}
            </span>
          </div>
          <ProgressBar current={soldCount} total={raffle.totalNumbers} />
          <p className="text-center text-xs text-orange-600 font-bold">
            &#x1F525; RESTAM POUCOS! Garanta o seu agora
          </p>
        </div>
      </div>
    </section>
  );
}
