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
  assignNumber: (data: {
    raffleId: string;
    numberValue: number;
    buyerName: string;
    buyerPhone: string;
  }) =>
    request<{ success: boolean; numberValue: number; buyerName: string; buyerPhone: string }>(
      "/api/master/assign-number",
      { method: "POST", body: JSON.stringify(data) },
    ),
};
