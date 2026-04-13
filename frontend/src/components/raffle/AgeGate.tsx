"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "age_verified";

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    setVerified(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVerified(true);
  }

  function handleReject() {
    window.location.href = "https://www.google.com";
  }

  if (verified === null) return null;

  if (verified) return <>{children}</>;

  return (
    <>
      {children}
      {/* Overlay */}
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl animate-float-up">
          {/* 18+ badge */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center">
              <span className="text-white text-2xl font-black">18+</span>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-extrabold text-gray-900">
              Você tem mais de 18 anos?
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Para continuar, confirme sua idade e aceite os termos de uso e
              regulamento da promoção.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleAccept}
              className="w-full btn-primary py-4 text-base"
            >
              Sim, tenho 18 anos ou mais
            </button>
            <button
              onClick={handleReject}
              className="w-full btn-outline py-3 text-sm text-gray-500"
            >
              Não
            </button>
          </div>

          <p className="text-gray-300 text-[10px] text-center leading-relaxed">
            Ao clicar em &quot;Sim&quot;, você declara ter 18 anos ou mais e
            concorda com os termos de uso e política de privacidade desta
            plataforma.
          </p>
        </div>
      </div>
    </>
  );
}
