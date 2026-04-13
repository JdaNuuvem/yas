"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DrawnNumber {
  position: number;
  value: number;
  timestamp: Date;
}

function generateRandom(): number {
  return Math.floor(Math.random() * 1000000);
}

function padNum(n: number): string {
  return n.toString().padStart(6, "0");
}

export default function LiveDrawPage() {
  const [mode, setMode] = useState<"idle" | "config" | "drawing">("idle");
  const [drawnNumbers, setDrawnNumbers] = useState<DrawnNumber[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [batchSize, setBatchSize] = useState(1);
  const [totalPrizes, setTotalPrizes] = useState(10);
  const [drawSpeed, setDrawSpeed] = useState(3000); // ms per draw
  const [presetNumbers, setPresetNumbers] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const presetQueueRef = useRef<number[]>([]);
  const positionRef = useRef(0);

  const getNextNumber = useCallback((): number => {
    if (presetQueueRef.current.length > 0) {
      return presetQueueRef.current.shift()!;
    }
    return generateRandom();
  }, []);

  const spinAndReveal = useCallback((): Promise<number> => {
    return new Promise((resolve) => {
      setIsSpinning(true);
      const duration = Math.min(drawSpeed - 500, 2500);
      const intervalMs = 50;
      const steps = Math.floor(duration / intervalMs);
      let step = 0;

      const spin = setInterval(() => {
        setCurrentNumber(generateRandom());
        step++;
        if (step >= steps) {
          clearInterval(spin);
          const finalNumber = getNextNumber();
          setCurrentNumber(finalNumber);
          setIsSpinning(false);
          resolve(finalNumber);
        }
      }, intervalMs);
    });
  }, [drawSpeed, getNextNumber]);

  const drawOne = useCallback(async () => {
    const number = await spinAndReveal();
    positionRef.current += 1;
    const drawn: DrawnNumber = {
      position: positionRef.current,
      value: number,
      timestamp: new Date(),
    };
    setDrawnNumbers((prev) => [drawn, ...prev]);
    return drawn;
  }, [spinAndReveal]);

  const startBatchDraw = useCallback(async () => {
    if (mode === "drawing") return;
    setMode("drawing");

    // Parse preset numbers
    if (presetNumbers.trim()) {
      presetQueueRef.current = presetNumbers
        .split(/[,\s\n]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 0 && n <= 999999);
    }

    const count = batchSize;
    for (let i = 0; i < count; i++) {
      if (positionRef.current >= totalPrizes) break;
      await drawOne();
      if (i < count - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    setMode("idle");
  }, [mode, batchSize, totalPrizes, presetNumbers, drawOne]);

  const startAutoDraw = useCallback(async () => {
    if (mode === "drawing") return;
    setMode("drawing");

    if (presetNumbers.trim()) {
      presetQueueRef.current = presetNumbers
        .split(/[,\s\n]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 0 && n <= 999999);
    }

    const loop = async () => {
      if (positionRef.current >= totalPrizes) {
        setMode("idle");
        return;
      }
      await drawOne();
      intervalRef.current = setTimeout(loop, drawSpeed);
    };
    loop();
  }, [mode, totalPrizes, presetNumbers, drawOne, drawSpeed]);

  const stopDraw = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    setMode("idle");
  }, []);

  const resetAll = useCallback(() => {
    stopDraw();
    setDrawnNumbers([]);
    setCurrentNumber(null);
    positionRef.current = 0;
    presetQueueRef.current = [];
  }, [stopDraw]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header — looks like a generic draw site */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-black text-xs">
              S
            </div>
            <span className="font-bold text-lg tracking-tight">SorteioBR</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">
              Ao Vivo
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Current number display */}
        <div className="text-center space-y-4">
          <p className="text-white/40 text-sm uppercase tracking-widest">
            {positionRef.current < totalPrizes
              ? `${positionRef.current + 1}º Número`
              : "Sorteio Finalizado"}
          </p>

          <div className="relative">
            <motion.div
              className="flex justify-center gap-2"
              key={isSpinning ? "spinning" : "stable"}
            >
              {(currentNumber !== null ? padNum(currentNumber) : "------")
                .split("")
                .map((digit, i) => (
                  <motion.div
                    key={`${i}-${digit}-${isSpinning}`}
                    initial={isSpinning ? { y: -10 } : { scale: 1.2 }}
                    animate={isSpinning ? { y: 0 } : { scale: 1 }}
                    className={`w-16 h-20 sm:w-20 sm:h-24 rounded-xl flex items-center justify-center text-4xl sm:text-5xl font-black ${
                      isSpinning
                        ? "bg-white/5 text-yellow-300/60"
                        : currentNumber !== null
                          ? "bg-gradient-to-b from-yellow-400/20 to-yellow-600/10 text-yellow-300 border border-yellow-500/30"
                          : "bg-white/5 text-white/20"
                    }`}
                  >
                    {digit}
                  </motion.div>
                ))}
            </motion.div>
          </div>

          {!isSpinning && currentNumber !== null && drawnNumbers.length > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-yellow-400 font-bold text-lg"
            >
              {drawnNumbers[0].position}º Número Sorteado!
            </motion.p>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Total de Prêmios</label>
              <input
                type="number"
                min={1}
                max={100}
                value={totalPrizes}
                onChange={(e) => setTotalPrizes(Number(e.target.value))}
                disabled={mode === "drawing"}
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Quantidade por vez</label>
              <input
                type="number"
                min={1}
                max={totalPrizes}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                disabled={mode === "drawing"}
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Velocidade (seg)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={drawSpeed / 1000}
                onChange={(e) => setDrawSpeed(Number(e.target.value) * 1000)}
                disabled={mode === "drawing"}
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Sorteados</label>
              <div className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm text-center">
                {positionRef.current} / {totalPrizes}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1">
              Números predefinidos (opcional, separados por vírgula)
            </label>
            <textarea
              value={presetNumbers}
              onChange={(e) => setPresetNumbers(e.target.value)}
              disabled={mode === "drawing"}
              placeholder="Ex: 847293, 123456, 654321..."
              rows={2}
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder:text-white/20 disabled:opacity-50 resize-none"
            />
          </div>

          <div className="flex gap-3">
            {mode !== "drawing" ? (
              <>
                <button
                  onClick={startBatchDraw}
                  disabled={positionRef.current >= totalPrizes}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-all"
                >
                  Sortear {batchSize > 1 ? `${batchSize} Números` : "1 Número"}
                </button>
                <button
                  onClick={startAutoDraw}
                  disabled={positionRef.current >= totalPrizes}
                  className="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all border border-white/10"
                >
                  Sortear Todos
                </button>
              </>
            ) : (
              <button
                onClick={stopDraw}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Parar
              </button>
            )}
            <button
              onClick={resetAll}
              disabled={mode === "drawing"}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-medium transition-all disabled:opacity-30 border border-white/10"
            >
              Resetar
            </button>
          </div>
        </div>

        {/* Results table */}
        <AnimatePresence>
          {drawnNumbers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-bold text-white/80">Números Sorteados</h2>
                <span className="text-xs text-white/40">{drawnNumbers.length} resultado(s)</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {drawnNumbers.map((drawn, idx) => (
                  <motion.div
                    key={drawn.position}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx === 0 ? 0.2 : 0 }}
                    className={`flex items-center justify-between px-6 py-3 border-b border-white/5 ${
                      idx === 0 ? "bg-yellow-500/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          drawn.position <= 3
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {drawn.position}º
                      </span>
                      <span className="font-mono text-xl font-black text-white tracking-wider">
                        {padNum(drawn.value)}
                      </span>
                    </div>
                    <span className="text-xs text-white/30">
                      {drawn.timestamp.toLocaleTimeString("pt-BR")}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-4 text-center">
        <p className="text-white/20 text-xs">
          SorteioBR - Plataforma de sorteios digitais - {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
