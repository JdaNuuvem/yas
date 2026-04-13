"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export function MyNumbers() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  
  const [purchases, setPurchases] = useState<Awaited<ReturnType<typeof api.getMyPurchases>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Insira o telefone completo com DDD.");
      return;
    }
    setError("");
    setIsLoading(true);
    setPurchases(null);

    try {
      const data = await api.getMyPurchases(cleanPhone);
      setPurchases(data);
    } catch (err: any) {
      setError(err.message || "Erro ao buscar. Verifique o telefone e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full card p-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
      >
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="#2d6a4f"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
        </svg>
        <span className="text-gray-700 text-sm font-semibold">
          Meus Títulos
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 card p-4 space-y-3 animate-float-up">
          <p className="text-gray-400 text-xs text-center">
            Insira seu telefone para consultar seus números
          </p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="(00) 00000-0000"
              className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm"
              disabled={isLoading}
            />
            <button 
              onClick={handleSearch} 
              disabled={isLoading}
              className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {isLoading ? "..." : "Buscar"}
            </button>
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          {purchases && purchases.length === 0 && (
            <p className="text-gray-500 text-xs text-center mt-4 pb-2">
              Nenhum título encontrado para este telefone.
            </p>
          )}

          {purchases && purchases.length > 0 && (
            <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pb-2">
              {purchases.map(p => (
                <div key={p.id} className="border border-gray-100 bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800">{p.raffle.name}</h4>
                      <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                      p.paymentStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      p.paymentStatus === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {p.paymentStatus === 'CONFIRMED' ? 'PAGO' : 
                       p.paymentStatus === 'PENDING' ? 'PENDENTE' : 'EXPIRADO'}
                    </span>
                  </div>
                  
                  <div className="mt-3 mb-2 flex flex-wrap gap-1">
                    {p.numbers.map((n, idx) => (
                      <span key={idx} className="bg-white border border-gray-200 text-gray-700 text-xs font-mono px-2 py-1 rounded">
                        {n.numberValue.toString().padStart(6, '0')}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-800">
                      R$ {(p.totalAmount / 100).toFixed(2).replace('.', ',')}
                    </span>
                    {p.paymentStatus === 'PENDING' && (
                      <Link href={`/checkout/${p.id}`} className="text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors font-semibold">
                        Pagar Agora
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
