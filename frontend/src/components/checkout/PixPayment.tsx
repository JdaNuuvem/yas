"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = qrCode;
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
        <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="#2d6a4f"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">
          Pagamento PIX
        </h2>
        <p className="text-gray-400 text-sm">
          Escaneie o QR Code ou copie o código
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 inline-block mx-auto border border-gray-100 shadow-sm">
        <QRCodeSVG
          value={qrCode}
          size={220}
          level="M"
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      <div className="space-y-4">
        <p className="text-3xl font-black text-green-600">
          {formatCurrency(amount)}
        </p>

        <button
          onClick={handleCopy}
          className="w-full btn-outline py-3.5 text-sm"
        >
          {copied ? "Copiado!" : "Copiar código PIX"}
        </button>

        <p className="text-gray-300 text-[11px]">ID: {purchaseId}</p>
      </div>
    </div>
  );
}
