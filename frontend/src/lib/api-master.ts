const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }
  return response.json();
}

export const masterApi = {
  login: (email: string, password: string) =>
    request<{ token: string }>("/api/master/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  dashboard: (raffleId: string) =>
    request<import("@/types").MasterDashboard>(
      `/api/master/dashboard?raffleId=${raffleId}`,
    ),
  gatewayStatus: () =>
    request<{ nextGateway: string; splitPercentage: number }>(
      "/api/master/gateway/status",
    ),
  overrideGateway: (gateway: "A" | "B") =>
    request<{ activeGateway: string }>("/api/master/gateway/override", {
      method: "PUT",
      body: JSON.stringify({ gateway }),
    }),
  getCredentials: () =>
    request<{
      paradiseA: { configured: boolean };
      paradiseB: { configured: boolean };
      splitPercentage: number;
    }>("/api/master/credentials"),
  updateCredentials: (data: {
    paradiseAApiKey: string;
    paradiseASecret: string;
    paradiseAWebhookSecret: string;
    paradiseBApiKey: string;
    paradiseBSecret: string;
    paradiseBWebhookSecret: string;
  }) =>
    request<{ success: boolean }>("/api/master/credentials", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getSplit: () =>
    request<{ nextGateway: string; splitPercentage: number }>(
      "/api/master/gateway/status",
    ),
  updateSplit: (splitPercentage: number) =>
    request<{ success: boolean; splitPercentage: number }>(
      "/api/master/split",
      { method: "PUT", body: JSON.stringify({ splitPercentage }) },
    ),
  resetAll: (raffleId: string) =>
    request<{ success: boolean; message: string }>(
      "/api/master/reset-all",
      { method: "POST", body: JSON.stringify({ raffleId }) },
    ),
  assignNumber: (data: {
    raffleId: string;
    numberValue: number;
    buyerName: string;
    buyerCpf: string;
    buyerPhone: string;
  }) =>
    request<{ success: boolean; numberValue: number; buyerName: string; buyerPhone: string }>(
      "/api/master/assign-number",
      { method: "POST", body: JSON.stringify(data) },
    ),
  assignBulk: (data: {
    raffleId: string;
    quantity: number;
    buyerName: string;
    buyerCpf: string;
    buyerPhone: string;
  }) =>
    request<{ success: boolean; assigned: number; buyerName: string; numbers: number[] }>(
      "/api/master/assign-bulk",
      { method: "POST", body: JSON.stringify(data) },
    ),
  setWinner: (raffleId: string, position: number, numberValue: number) =>
    request<{ success: boolean }>(
      `/api/master/draw/${position}/set`,
      { method: "PUT", body: JSON.stringify({ raffleId, numberValue }) },
    ),
  simulateMilestone: (raffleId: string) =>
    request<{
      success: boolean;
      milestone?: string;
      position?: number;
      prizeName?: string;
      winnerNumber?: number;
      winnerName?: string;
      message?: string;
    }>("/api/master/simulate-milestone", {
      method: "POST",
      body: JSON.stringify({ raffleId }),
    }),
  getPrizePredestination: (raffleId: string) =>
    request<
      Array<{
        id: string;
        position: number;
        name: string;
        predestinedNumber: number | null;
        hasExplicitPredestination: boolean;
        buyerName: string | null;
        buyerPhone: string | null;
        numberStatus: "AVAILABLE" | "RESERVED" | "SOLD" | null;
        locked: boolean;
        drawn: boolean;
        winnerNumber: number | null;
        milestoneReached?: boolean;
        released?: boolean;
      }>
    >(`/api/master/prizes-predestination?raffleId=${raffleId}`),
  predestinePrize: (data: {
    raffleId: string;
    position: number;
    numberValue: number;
    buyerName: string;
    buyerCpf: string;
    buyerPhone: string;
  }) =>
    request<{
      success: boolean;
      position: number;
      numberValue: number;
      buyerName: string;
      buyerPhone: string;
    }>("/api/master/predestine-prize", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removePredestination: (raffleId: string, position: number) =>
    request<{ success: boolean }>(
      `/api/master/predestine-prize/${position}`,
      {
        method: "DELETE",
        body: JSON.stringify({ raffleId }),
      },
    ),
  getBypassCpfs: () =>
    request<{ cpfs: string[] }>("/api/master/bypass-cpfs"),
  addBypassCpf: (cpf: string) =>
    request<{ success: boolean; cpfs: string[] }>("/api/master/bypass-cpfs", {
      method: "POST",
      body: JSON.stringify({ cpf }),
    }),
  removeBypassCpf: (cpf: string) =>
    request<{ success: boolean; cpfs: string[] }>("/api/master/bypass-cpfs", {
      method: "DELETE",
      body: JSON.stringify({ cpf }),
    }),
  getBypassStates: () =>
    request<{ states: string[] }>("/api/master/bypass-states"),
  addBypassState: (state: string) =>
    request<{ success: boolean; states: string[] }>("/api/master/bypass-states", {
      method: "POST",
      body: JSON.stringify({ state }),
    }),
  removeBypassState: (state: string) =>
    request<{ success: boolean; states: string[] }>("/api/master/bypass-states", {
      method: "DELETE",
      body: JSON.stringify({ state }),
    }),
  releasePrizeNumber: (raffleId: string, position: number) =>
    request<{ success: boolean }>(
      `/api/master/release-prize/${position}`,
      {
        method: "POST",
        body: JSON.stringify({ raffleId }),
      },
    ),
};
