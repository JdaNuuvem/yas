import { create } from "zustand";

interface CartState {
  selectedNumbers: Set<number>;
  add: (n: number) => void;
  remove: (n: number) => void;
  toggle: (n: number) => void;
  addMany: (numbers: number[]) => void;
  clear: () => void;
  total: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  selectedNumbers: new Set(),
  add: (n) =>
    set((state) => {
      const next = new Set(state.selectedNumbers);
      next.add(n);
      return { selectedNumbers: next };
    }),
  remove: (n) =>
    set((state) => {
      const next = new Set(state.selectedNumbers);
      next.delete(n);
      return { selectedNumbers: next };
    }),
  toggle: (n) => {
    const { selectedNumbers, add, remove } = get();
    if (selectedNumbers.has(n)) {
      remove(n);
    } else {
      add(n);
    }
  },
  addMany: (numbers) =>
    set((state) => {
      const next = new Set(state.selectedNumbers);
      numbers.forEach((n) => next.add(n));
      return { selectedNumbers: next };
    }),
  clear: () => set({ selectedNumbers: new Set() }),
  total: () => get().selectedNumbers.size * 0.2,
}));
