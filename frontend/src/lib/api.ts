const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const needsAuth = path.startsWith("/api/admin");
  const token =
    needsAuth && typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;
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
    buyerEmail?: string;
    numbers: number[];
  }) =>
    request<import("@/types").PurchaseResult>("/api/purchase", {
      method: "POST",
      body: JSON.stringify({
        raffleId: data.raffleId,
        buyerName: data.buyerName,
        buyerCpf: data.buyerCpf,
        buyerPhone: data.buyerPhone,
        buyerEmail: data.buyerEmail ?? "",
        numberValues: data.numbers,
      }),
    }),
  getPurchaseStatus: (id: string) =>
    request<{ paymentStatus: string }>(`/api/purchase/${id}/status`),
  getMyPurchases: (phone: string) => 
    request<
      {
        id: string;
        paymentStatus: string;
        totalAmount: number;
        createdAt: string;
        raffle: { name: string; status: string };
        numbers: { numberValue: number; status: string }[];
      }[]
    >(`/api/purchase/my-titles?phone=${encodeURIComponent(phone)}`),
  getProgress: (raffleId: string) =>
    request<{ percentage: number; milestonesReached: number; nextMilestone: number }>(
      `/api/raffle/${raffleId}/progress`,
    ),
  getRecentBuyers: (raffleId: string) =>
    request<
      { name: string; buyerName?: string; quantity: number; createdAt: string }[]
    >(`/api/raffle/${raffleId}/buyers/recent`),
  getTopBuyers: (raffleId: string) =>
    request<
      { name: string; totalNumbers: number }[]
    >(`/api/raffle/${raffleId}/buyers/top`),
  getDrawData: (raffleId: string, position: number) =>
    request<{
      position: number;
      status: "pending" | "animating" | "drawn";
      winnerNumber?: number;
      winnerName?: string;
      prizeName: string;
      revealsAt?: string;
    }>(`/api/draw/${position}?raffleId=${raffleId}`),
  // Admin search number owner
  adminSearchNumber: (raffleId: string, numberValue: number) =>
    request<{
      numberValue: number;
      status: string;
      buyerName: string | null;
      buyerPhone: string | null;
    }>(`/api/admin/numbers/search?raffleId=${raffleId}&q=${numberValue}`),
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
  adminResetDraws: (raffleId: string) =>
    request<{ success: boolean; reset: number }>(`/api/admin/draws/reset`, {
      method: "POST",
      body: JSON.stringify({ raffleId }),
    }),
  adminTriggerDraw: (raffleId: string, position: number, numberValue: number) =>
    request<{ winnerNumber: number; drawnAt: string }>(
      `/api/admin/draw/${position}`,
      {
        method: "POST",
        body: JSON.stringify({ raffleId, numberValue }),
      },
    ),
  updateRaffle: (raffleId: string, data: Partial<import("@/types").Raffle>) =>
    request<import("@/types").Raffle>(`/api/admin/raffle/${raffleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  // Admin set predetermined winner (proxied through admin endpoint)
  adminSetWinner: (raffleId: string, position: number, numberValue: number) =>
    request<{ success: boolean }>(`/api/admin/draw/${position}/set`, {
      method: "PUT",
      body: JSON.stringify({ raffleId, numberValue }),
    }),
  // Admin prizes
  adminCreatePrize: (data: { raffleId: string; position: number; name: string; description?: string }) =>
    request<import("@/types").Prize>("/api/admin/prizes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  adminUpdatePrize: (prizeId: string, data: { name?: string; description?: string }) =>
    request<import("@/types").Prize>(`/api/admin/prizes/${prizeId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  adminDeletePrize: (prizeId: string) =>
    request<{ success: boolean }>(`/api/admin/prizes/${prizeId}`, {
      method: "DELETE",
    }),
  // Admin gateway keys
  adminGetGatewayKeys: () =>
    request<{ hasKeys: boolean }>(
      "/api/admin/gateway-keys",
    ),
  adminSaveGatewayKeys: (secretKey: string) =>
    request<{ success: boolean }>("/api/admin/gateway-keys", {
      method: "PUT",
      body: JSON.stringify({ secretKey }),
    }),
};
