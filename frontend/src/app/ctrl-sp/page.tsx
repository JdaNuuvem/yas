"use client";

import { useState } from "react";
import { masterApi } from "@/lib/api-master";

export default function CtrlSpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [split, setSplit] = useState(50);
  const [gateway, setGateway] = useState<"A" | "B">("A");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const res = await masterApi.login(email, password);
      localStorage.setItem("token", res.token);
      const data = await masterApi.getSplit();
      setSplit(data.splitPercentage);
      setGateway(data.nextGateway as "A" | "B");
      setAuthenticated(true);
    } catch {
      setStatus("Credenciais invalidas");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSplit() {
    setLoading(true);
    setStatus("");
    try {
      await masterApi.updateSplit(split);
      setStatus("Split atualizado: " + split + "%");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchGateway(gw: "A" | "B") {
    setLoading(true);
    setStatus("");
    try {
      await masterApi.overrideGateway(gw);
      setGateway(gw);
      setStatus("Gateway alterado para " + gw);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm space-y-5 border border-gray-800"
        >
          <h1 className="text-xl font-bold text-white text-center">Acesso</h1>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {status && <p className="text-red-400 text-xs text-center">{status}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg text-sm font-bold disabled:opacity-50"
          >
            {loading ? "..." : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md space-y-6 border border-gray-800">
        <h1 className="text-xl font-bold text-white">Painel de Controle</h1>

        {/* Split */}
        <div className="space-y-3">
          <label className="block text-sm text-gray-400 font-medium">
            Split de Receita
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-white font-black text-2xl w-16 text-right">
              {split}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Conta A: {split}%</span>
            <span>Conta B: {100 - split}%</span>
          </div>
          <button
            onClick={handleSaveSplit}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {loading ? "Salvando..." : "Salvar Split"}
          </button>
        </div>

        <hr className="border-gray-800" />

        {/* Gateway override */}
        <div className="space-y-3">
          <label className="block text-sm text-gray-400 font-medium">
            Gateway Ativo
          </label>
          <div className="flex gap-3">
            {(["A", "B"] as const).map((gw) => (
              <button
                key={gw}
                onClick={() => handleSwitchGateway(gw)}
                disabled={loading}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-colors ${
                  gateway === gw
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Conta {gw}
                {gateway === gw && " (ativo)"}
              </button>
            ))}
          </div>
        </div>

        {status && (
          <p
            className={`text-xs text-center ${
              status.includes("Erro") || status.includes("invalidas")
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
