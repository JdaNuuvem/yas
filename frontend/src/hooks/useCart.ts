import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartState {
  selectedNumbers: number[];
  pricePerNumber: number;
  setPricePerNumber: (price: number) => void;
  add: (n: number) => void;
  remove: (n: number) => void;
  toggle: (n: number) => void;
  addMany: (numbers: number[]) => void;
  clear: () => void;
  total: () => number;
  has: (n: number) => boolean;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      selectedNumbers: [],
      pricePerNumber: 0,
      setPricePerNumber: (price) => set({ pricePerNumber: price }),
      add: (n) =>
        set((state) => {
          if (state.selectedNumbers.includes(n)) return state;
          return { selectedNumbers: [...state.selectedNumbers, n] };
        }),
      remove: (n) =>
        set((state) => ({
          selectedNumbers: state.selectedNumbers.filter((v) => v !== n),
        })),
      toggle: (n) => {
        const { selectedNumbers, add, remove } = get();
        if (selectedNumbers.includes(n)) {
          remove(n);
        } else {
          add(n);
        }
      },
      addMany: (numbers) =>
        set((state) => {
          const existing = new Set(state.selectedNumbers);
          const newNums = numbers.filter((n) => !existing.has(n));
          return { selectedNumbers: [...state.selectedNumbers, ...newNums] };
        }),
      clear: () => set({ selectedNumbers: [] }),
      total: () => get().selectedNumbers.length * get().pricePerNumber,
      has: (n) => get().selectedNumbers.includes(n),
      count: () => get().selectedNumbers.length,
    }),
    {
      name: "yasmin-cart",
    },
  ),
);
