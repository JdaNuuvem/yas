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

export const api = {
  // Public
  getRaffle: () => request<import("@/types").Raffle>("/api/raffle"),
  getNumbers: (raffleId: string, page: number, limit = 1000) =>
    request<import("@/types").NumbersPage>(
      `/api/raffle/${raffleId}/numbers?page=${page}&limit=${limit}`,
    ),
  getRandomNumbers: (raffleId: string, quantity: number) =>
    request<number[]>(
      `/api/raffle/${raffleId}/numbers/random?quantity=${quantity}`,
    ),
  searchNumber: (raffleId: string, q: number) =>
    request<import("@/types").RaffleNumber>(
      `/api/raffle/${raffleId}/numbers/search?q=${q}`,
    ),
  createPurchase: (data: {
    raffleId: string;
    buyerName: string;
    buyerCpf: string;
    buyerPhone: string;
    numbers: number[];
  }) =>
    request<import("@/types").PurchaseResult>("/api/purchase", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getPurchaseStatus: (id: string) =>
    request<{ paymentStatus: string }>(`/api/purchase/${id}/status`),
  getRecentBuyers: (raffleId: string) =>
    request<
      { buyerName: string; quantity: number; createdAt: string }[]
    >(`/api/raffle/${raffleId}/buyers/recent`),
  getTopBuyers: (raffleId: string) =>
    request<
      { buyerName: string; totalNumbers: number }[]
    >(`/api/raffle/${raffleId}/buyers/top`),
  getDrawData: (raffleId: string, position: number) =>
    request<{ winnerNumber: number | null; drawnAt: string | null }>(
      `/api/draw/${position}?raffleId=${raffleId}`,
    ),
  // Admin
  adminLogin: (email: string, password: string) =>
    request<{ token: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  adminDashboard: (raffleId: string) =>
    request<import("@/types").DashboardData>(
      `/api/admin/dashboard?raffleId=${raffleId}`,
    ),
  adminBuyers: (raffleId: string, page = 1) =>
    request<{
      buyers: { id: string; buyerName: string; quantity: number; totalAmount: number }[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/admin/buyers?raffleId=${raffleId}&page=${page}`),
  adminTriggerDraw: (raffleId: string, position: number) =>
    request<{ winnerNumber: number; drawnAt: string }>(
      `/api/admin/draw/${position}`,
      {
        method: "POST",
        body: JSON.stringify({ raffleId }),
      },
    ),
  updateRaffle: (raffleId: string, data: Partial<import("@/types").Raffle>) =>
    request<import("@/types").Raffle>(`/api/admin/raffle/${raffleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  // Master
  masterLogin: (email: string, password: string) =>
    request<{ token: string }>("/api/master/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  masterDashboard: (raffleId: string) =>
    request<import("@/types").MasterDashboard>(
      `/api/master/dashboard?raffleId=${raffleId}`,
    ),
  masterGatewayStatus: () =>
    request<{ activeGateway: string; statusA: string; statusB: string }>(
      "/api/master/gateway/status",
    ),
  masterOverrideGateway: (gateway: "A" | "B") =>
    request<{ activeGateway: string }>("/api/master/gateway/override", {
      method: "PUT",
      body: JSON.stringify({ gateway }),
    }),
  masterSetWinner: (
    raffleId: string,
    position: number,
    numberValue: number,
  ) =>
    request<{ winnerNumber: number; drawnAt: string }>(
      `/api/master/draw/${position}/set`,
      {
        method: "PUT",
        body: JSON.stringify({ raffleId, numberValue }),
      },
    ),
};
