"use client";

import { useState } from "react";

interface BuyerFormData {
  buyerName: string;
  buyerCpf: string;
  buyerPhone: string;
  buyerEmail: string;
}

interface BuyerFormProps {
  onSubmit: (data: BuyerFormData) => void;
  isLoading: boolean;
}

export function BuyerForm({ onSubmit, isLoading }: BuyerFormProps) {
  const [form, setForm] = useState<BuyerFormData>({
    buyerName: "",
    buyerCpf: "",
    buyerPhone: "",
    buyerEmail: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BuyerFormData, string>>>({});

  function validate(): boolean {
    const next: Partial<Record<keyof BuyerFormData, string>> = {};

    if (!form.buyerName.trim()) {
      next.buyerName = "Nome e obrigatorio";
    }

    const cpfDigits = form.buyerCpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      next.buyerCpf = "CPF deve ter 11 digitos";
    }

    const phoneDigits = form.buyerPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      next.buyerPhone = "Telefone invalido";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      buyerCpf: form.buyerCpf.replace(/\D/g, ""),
      buyerPhone: form.buyerPhone.replace(/\D/g, ""),
    });
  }

  function handleChange(field: keyof BuyerFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Nome completo *
        </label>
        <input
          type="text"
          value={form.buyerName}
          onChange={(e) => handleChange("buyerName", e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
          placeholder="Seu nome completo"
        />
        {errors.buyerName && (
          <p className="text-red-400 text-xs mt-1">{errors.buyerName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">CPF *</label>
        <input
          type="text"
          value={form.buyerCpf}
          onChange={(e) => handleChange("buyerCpf", e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
          placeholder="000.000.000-00"
          maxLength={14}
        />
        {errors.buyerCpf && (
          <p className="text-red-400 text-xs mt-1">{errors.buyerCpf}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          WhatsApp / Telefone *
        </label>
        <input
          type="text"
          value={form.buyerPhone}
          onChange={(e) => handleChange("buyerPhone", e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
          placeholder="(00) 00000-0000"
          maxLength={15}
        />
        {errors.buyerPhone && (
          <p className="text-red-400 text-xs mt-1">{errors.buyerPhone}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Email (opcional)
        </label>
        <input
          type="email"
          value={form.buyerEmail}
          onChange={(e) => handleChange("buyerEmail", e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
          placeholder="seu@email.com"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-bold py-3 rounded-lg transition-colors"
      >
        {isLoading ? "Processando..." : "Gerar pagamento PIX"}
      </button>
    </form>
  );
}
