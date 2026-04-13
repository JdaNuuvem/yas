"use client";

import { useState } from "react";

export function Regulation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="px-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full card p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="#2d6a4f"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="text-gray-700 text-sm font-semibold">
            Descrição / Regulamento
          </span>
        </div>
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 card p-4 animate-float-up">
          <div className="space-y-3 text-gray-500 text-xs leading-relaxed">
            <p>
              Este sorteio será realizado com base nos resultados da Loteria
              Federal. Os números da sorte adquiridos concorrem a todos os
              prêmios listados na campanha.
            </p>
            <p>
              Ao adquirir um número, o participante declara estar ciente e de
              acordo com as regras desta promoção. A participação é restrita a
              maiores de 18 anos.
            </p>
            <p>
              Os prêmios serão entregues aos ganhadores em até 30 dias após a
              realização do sorteio. Os resultados serão divulgados neste site e
              nas redes sociais oficiais.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
