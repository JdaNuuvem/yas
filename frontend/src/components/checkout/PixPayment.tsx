"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrency } from "@/lib/format";

const PIX_EXPIRY_SECONDS = 5 * 60; // 5 minutes

interface PixPaymentProps {
  qrCode: string;
  qrCodeText: string;
  amount: number;
  purchaseId: string;
  gatewayTransactionId?: string;
  quantity?: number;
}

export function PixPayment({
  qrCode,
  qrCodeText,
  amount,
  purchaseId,
  gatewayTransactionId,
  quantity,
}: PixPaymentProps) {
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PIX_EXPIRY_SECONDS);

  const isExpired = secondsLeft <= 0;
  const isUrgent = secondsLeft > 0 && secondsLeft < 60;

  useEffect(() => {
    if (isExpired) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired]);

  const formatTime = useCallback((totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, []);

  async function handleCopy() {
    if (isExpired) return;
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

      {/* Countdown Timer */}
      <div className="flex items-center justify-center gap-2">
        {isExpired ? (
          <span className="text-red-600 font-bold text-lg">
            PIX expirado
          </span>
        ) : (
          <>
            <span className="text-gray-500 text-sm">Expira em</span>
            <span
              className={`font-mono font-bold text-lg ${
                isUrgent ? "text-red-600" : "text-gray-800"
              }`}
            >
              {formatTime(secondsLeft)}
            </span>
          </>
        )}
      </div>

      <div
        className={`bg-white rounded-2xl p-5 inline-block mx-auto border border-gray-100 shadow-sm ${
          isExpired ? "opacity-40" : ""
        }`}
      >
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
          disabled={isExpired}
          className={`w-full btn-outline py-3.5 text-sm ${
            isExpired ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isExpired
            ? "PIX expirado"
            : copied
              ? "Copiado!"
              : "Copiar código PIX"}
        </button>

        <div className="space-y-1">
          <p className="text-gray-300 text-[11px]">ID: {purchaseId}</p>
          {gatewayTransactionId && (
            <p className="text-gray-300 text-[11px]">
              Transação: {gatewayTransactionId}
            </p>
          )}
        </div>

        <Link
          href={`/reclamacao?purchaseId=${purchaseId}${gatewayTransactionId ? `&transactionId=${gatewayTransactionId}` : ""}${quantity ? `&qty=${quantity}` : ""}`}
          className="block w-full mt-4 py-2.5 text-center text-sm text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-xl transition-colors"
        >
          Tive um problema
        </Link>
      </div>
    </div>
  );
}
