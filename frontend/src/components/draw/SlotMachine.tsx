"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { padNumber } from "@/lib/format";

interface SlotMachineProps {
  targetNumber: number;
  onComplete: () => void;
  duration?: number;
}

export function SlotMachine({
  targetNumber,
  onComplete,
  duration = 12000,
}: SlotMachineProps) {
  const [displayNumber, setDisplayNumber] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  const animate = useCallback(
    (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) {
        setDisplayNumber(targetNumber);
        setIsDone(true);
        return;
      }

      let next: number;
      const maxNum = 999999;

      if (progress < 0.6) {
        // Fast random phase
        next = Math.floor(Math.random() * maxNum);
      } else if (progress < 0.9) {
        // Slowing down - numbers closer to target
        const range = Math.floor(maxNum * (1 - (progress - 0.6) / 0.3));
        const offset = Math.floor((Math.random() - 0.5) * range);
        next = Math.max(0, Math.min(maxNum, targetNumber + offset));
      } else {
        // Very close to target
        const range = Math.floor(100 * (1 - (progress - 0.9) / 0.1));
        const offset = Math.floor((Math.random() - 0.5) * range);
        next = Math.max(0, Math.min(maxNum, targetNumber + offset));
      }

      setDisplayNumber(next);

      // Adjust frame rate based on progress
      const delay = progress < 0.6 ? 33 : progress < 0.9 ? 80 : 150;
      const nextFrame = () => {
        rafRef.current = requestAnimationFrame(animate);
      };
      setTimeout(nextFrame, delay);
    },
    [targetNumber, duration],
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  useEffect(() => {
    if (isDone) {
      onComplete();
    }
  }, [isDone, onComplete]);

  const borderColor = isDone
    ? "border-green-500 shadow-green-500/50"
    : "border-indigo-500 shadow-indigo-500/50";

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <motion.div
        className={`rounded-2xl border-4 ${borderColor} shadow-lg p-8 md:p-12 bg-gray-900 transition-colors duration-500`}
        animate={
          isDone
            ? { scale: [1, 1.05, 1] }
            : { boxShadow: ["0 0 20px rgba(99,102,241,0.5)", "0 0 40px rgba(99,102,241,0.8)", "0 0 20px rgba(99,102,241,0.5)"] }
        }
        transition={
          isDone
            ? { duration: 0.5 }
            : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <p className="text-7xl md:text-9xl font-mono font-bold tabular-nums tracking-wider text-center">
          <span className={isDone ? "text-green-400" : "text-white"}>
            {padNumber(displayNumber)}
          </span>
        </p>
      </motion.div>

      {!isDone && (
        <motion.p
          className="text-gray-400 text-lg"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Sorteando...
        </motion.p>
      )}
    </div>
  );
}
