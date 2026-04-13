export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function maskName(name: string): string {
  const parts = name.split(" ");
  if (parts.length === 1) return name[0] + "***";
  return (
    parts[0] +
    " " +
    parts
      .slice(1)
      .map((p) => p[0] + "***")
      .join(" ")
  );
}

export function padNumber(n: number): string {
  return String(n).padStart(6, "0");
}
