import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SorteioBR - Sorteio ao Vivo",
  description: "Plataforma de sorteios digitais ao vivo",
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
