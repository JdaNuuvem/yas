import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "yasmin-sold";
const BASE = 400_000;
const LAUNCH = new Date("2026-04-13T00:00:00-03:00").getTime();
const PER_DAY = 20_000;

function getSimulated(): number {
  const days = Math.max(0, (Date.now() - LAUNCH) / (1000 * 60 * 60 * 24));
  return BASE + Math.floor(days * PER_DAY);
}

function loadStored(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

function persist(value: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(value));
  }
}

export function useSoldCount(realCount: number): number {
  const lastRef = useRef(0);

  const [count, setCount] = useState(() => {
    const stored = loadStored();
    const simulated = getSimulated();
    const best = Math.max(realCount, simulated, stored);
    persist(best);
    lastRef.current = best;
    return best;
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const simulated = getSimulated();
      const stored = loadStored();
      const increment = Math.floor(Math.random() * 76) + 25; // 25 a 100
      const next = Math.max(realCount, simulated, stored, lastRef.current) + increment;
      lastRef.current = next;
      persist(next);
      setCount(next);

      const nextDelay = (Math.floor(Math.random() * 20) + 5) * 1000; // 5s a 25s
      timeoutId = setTimeout(tick, nextDelay);
    };

    const firstDelay = (Math.floor(Math.random() * 10) + 3) * 1000;
    timeoutId = setTimeout(tick, firstDelay);

    return () => clearTimeout(timeoutId);
  }, [realCount]);

  return count;
}
