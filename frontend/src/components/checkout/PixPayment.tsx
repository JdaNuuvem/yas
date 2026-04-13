"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/format";

interface PixPaymentProps {
  qrCode: string;
  qrCodeText: string;
  amount: number;
  purchaseId: string;
}

export function PixPayment({
  qrCode,
  qrCodeText,
  amount,
  purchaseId,
}: PixPaymentProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = qrCodeText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Pagamento PIX</h2>
        <p className="text-gray-400 text-sm">
          Escaneie o QR Code ou copie o codigo abaixo
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 inline-block mx-auto">
        <Image
          src={qrCode}
          alt="QR Code PIX"
          width={250}
          height={250}
          className="mx-auto"
        />
      </div>

      <div className="space-y-3">
        <p className="text-2xl font-bold text-green-400">
          {formatCurrency(amount)}
        </p>

        <button
          onClick={handleCopy}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors text-sm"
        >
          {copied ? "Copiado!" : "Copiar codigo PIX"}
        </button>

        <p className="text-gray-500 text-xs">
          ID da compra: {purchaseId}
        </p>
      </div>
    </div>
  );
}
