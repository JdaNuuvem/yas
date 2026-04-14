import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "yasmin-sold";

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
    // Use the real count as base, only keep stored if it's higher
    const best = Math.max(realCount, stored);
    persist(best);
    lastRef.current = best;
    return best;
  });

  useEffect(() => {
    // When realCount updates from API, sync up
    if (realCount > lastRef.current) {
      lastRef.current = realCount;
      persist(realCount);
      setCount(realCount);
    }
  }, [realCount]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const stored = loadStored();
      const increment = Math.floor(Math.random() * 76) + 25;
      const next = Math.max(realCount, stored, lastRef.current) + increment;
      lastRef.current = next;
      persist(next);
      setCount(next);

      const nextDelay = (Math.floor(Math.random() * 20) + 5) * 1000;
      timeoutId = setTimeout(tick, nextDelay);
    };

    const firstDelay = (Math.floor(Math.random() * 10) + 3) * 1000;
    timeoutId = setTimeout(tick, firstDelay);

    return () => clearTimeout(timeoutId);
  }, [realCount]);

  return count;
}
