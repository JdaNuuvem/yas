/**
 * Mapping from Brazilian phone DDD (area code) to state (UF).
 */
const DDD_TO_STATE: Record<string, string> = {
  // São Paulo
  "11": "SP", "12": "SP", "13": "SP", "14": "SP", "15": "SP",
  "16": "SP", "17": "SP", "18": "SP", "19": "SP",
  // Rio de Janeiro
  "21": "RJ", "22": "RJ", "24": "RJ",
  // Espírito Santo
  "27": "ES", "28": "ES",
  // Minas Gerais
  "31": "MG", "32": "MG", "33": "MG", "34": "MG", "35": "MG",
  "37": "MG", "38": "MG",
  // Paraná
  "41": "PR", "42": "PR", "43": "PR", "44": "PR", "45": "PR", "46": "PR",
  // Santa Catarina
  "47": "SC", "48": "SC", "49": "SC",
  // Rio Grande do Sul
  "51": "RS", "53": "RS", "54": "RS", "55": "RS",
  // Distrito Federal / Goiás
  "61": "DF", "62": "GO", "64": "GO",
  // Mato Grosso
  "65": "MT", "66": "MT",
  // Mato Grosso do Sul
  "67": "MS",
  // Acre
  "68": "AC",
  // Rondônia
  "69": "RO",
  // Bahia
  "71": "BA", "73": "BA", "74": "BA", "75": "BA", "77": "BA",
  // Sergipe
  "79": "SE",
  // Pernambuco
  "81": "PE", "87": "PE",
  // Alagoas
  "82": "AL",
  // Paraíba
  "83": "PB",
  // Rio Grande do Norte
  "84": "RN",
  // Ceará
  "85": "CE", "88": "CE",
  // Piauí
  "86": "PI", "89": "PI",
  // Maranhão
  "98": "MA", "99": "MA",
  // Pará
  "91": "PA", "93": "PA", "94": "PA",
  // Amazonas
  "92": "AM", "97": "AM",
  // Amapá
  "96": "AP",
  // Roraima
  "95": "RR",
  // Tocantins
  "63": "TO",
};

/** Extract state (UF) from a Brazilian phone number. Returns null if DDD is unknown. */
export function stateFromPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  // Phone may have country code 55 prefix
  const ddd = digits.length >= 12 ? digits.slice(2, 4) : digits.slice(0, 2);
  return DDD_TO_STATE[ddd] ?? null;
}

/** All valid Brazilian state codes. */
export const BRAZILIAN_STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;
