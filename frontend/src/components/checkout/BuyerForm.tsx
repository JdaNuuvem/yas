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

const inputClass =
  "w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 text-sm placeholder:text-gray-300";

export function BuyerForm({ onSubmit, isLoading }: BuyerFormProps) {
  const [form, setForm] = useState<BuyerFormData>({
    buyerName: "",
    buyerCpf: "",
    buyerPhone: "",
    buyerEmail: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof BuyerFormData, string>>
  >({});

  function isValidCpf(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(cpf[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(cpf[10]);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof BuyerFormData, string>> = {};
    if (!form.buyerName.trim()) next.buyerName = "Nome é obrigatório";
    const cpfDigits = form.buyerCpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      next.buyerCpf = "CPF deve ter 11 dígitos";
    } else if (!isValidCpf(cpfDigits)) {
      next.buyerCpf = "CPF inválido";
    }
    const phoneDigits = form.buyerPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11)
      next.buyerPhone = "Telefone inválido";
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

  function maskCpf(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function handleChange(field: keyof BuyerFormData, value: string) {
    let masked = value;
    if (field === "buyerCpf") masked = maskCpf(value);
    if (field === "buyerPhone") masked = maskPhone(value);
    if (field === "buyerName") masked = value.slice(0, 100);
    if (field === "buyerEmail") masked = value.slice(0, 100);
    setForm((prev) => ({ ...prev, [field]: masked }));
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
        <label className="block text-xs text-gray-500 mb-1.5 font-medium">
          Nome completo *
        </label>
        <input
          type="text"
          value={form.buyerName}
          onChange={(e) => handleChange("buyerName", e.target.value)}
          className={inputClass}
          placeholder="Seu nome completo"
        />
        {errors.buyerName && (
          <p className="text-red-500 text-xs mt-1">{errors.buyerName}</p>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5 font-medium">
          CPF *
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={form.buyerCpf}
          onChange={(e) => handleChange("buyerCpf", e.target.value)}
          className={inputClass}
          placeholder="000.000.000-00"
          maxLength={14}
        />
        {errors.buyerCpf && (
          <p className="text-red-500 text-xs mt-1">{errors.buyerCpf}</p>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5 font-medium">
          WhatsApp / Telefone *
        </label>
        <input
          type="tel"
          inputMode="numeric"
          value={form.buyerPhone}
          onChange={(e) => handleChange("buyerPhone", e.target.value)}
          className={inputClass}
          placeholder="(00) 00000-0000"
          maxLength={15}
        />
        {errors.buyerPhone && (
          <p className="text-red-500 text-xs mt-1">{errors.buyerPhone}</p>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5 font-medium">
          Email (opcional)
        </label>
        <input
          type="email"
          value={form.buyerEmail}
          onChange={(e) => handleChange("buyerEmail", e.target.value)}
          className={inputClass}
          placeholder="seu@email.com"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full btn-primary py-3.5 text-sm disabled:opacity-50"
      >
        {isLoading ? "Processando..." : "Gerar pagamento PIX"}
      </button>
    </form>
  );
}
