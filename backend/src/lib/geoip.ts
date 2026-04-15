/**
 * IP-based geolocation using ip-api.com (free, no key required).
 * Returns the Brazilian state code (UF) or null if not in Brazil / lookup fails.
 */

interface IpApiResponse {
  readonly status: "success" | "fail";
  readonly countryCode?: string;
  readonly region?: string; // state code, e.g. "RJ"
}

export async function stateFromIp(ip: string): Promise<string | null> {
  // Skip private/local IPs — can't geolocate them
  if (isPrivateIp(ip)) return null;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,region`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return null;

    const data: IpApiResponse = await res.json();
    if (data.status !== "success") return null;
    if (data.countryCode !== "BR") return null;

    return data.region ?? null;
  } catch {
    // Network error or timeout — don't block the purchase
    return null;
  }
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.3") ||
    ip === "localhost"
  );
}
