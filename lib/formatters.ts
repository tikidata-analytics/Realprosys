export function formatCurrency(num: string | number | null | undefined): string {
  if (num == null) return "-";
  return Number(num).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

export function parseSort(sortStr: string | null): { orderBy: string; orderDir: "asc" | "desc" } {
  if (!sortStr) return { orderBy: "created_at", orderDir: "desc" };
  const [field, dir] = sortStr.split(":");
  return { orderBy: field || "created_at", orderDir: dir === "asc" ? "asc" : "desc" };
}

export function toggleSort(current: string, field: string): string {
  const { orderBy, orderDir } = parseSort(current);
  if (orderBy !== field) return `${field}:asc`;
  return orderDir === "asc" ? `${field}:desc` : `${field}:asc`;
}
