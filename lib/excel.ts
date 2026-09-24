import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

export async function exportToExcel<T>(
  resourceLabel: string,
  columns: { header: string; accessor: (row: T) => string | number | null | undefined }[],
  fetchPage: (page: number, sort: string, q?: string) => Promise<{ rows: T[]; total: number; totalPages: number }>,
  sort: string,
  q?: string
): Promise<void> {
  // Fetch all pages
  const firstPage = await fetchPage(1, sort, q);
  const allRows: T[] = [...firstPage.rows];

  if (firstPage.totalPages > 1) {
    const promises: Promise<{ rows: T[] }>[] = [];
    for (let p = 2; p <= firstPage.totalPages; p++) {
      promises.push(fetchPage(p, sort, q));
    }
    const results = await Promise.all(promises);
    for (const r of results) {
      allRows.push(...r.rows);
    }
  }

  // Build worksheet data
  const wsData = [
    columns.map((c) => c.header),
    ...allRows.map((row) =>
      columns.map((c) => {
        const val = c.accessor(row);
        if (val === null || val === undefined) return "";
        return val;
      })
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-width columns
  const colWidths = columns.map((c, ci) => {
    const values = wsData.slice(1).map((r) => String(r[ci] ?? ""));
    const maxLen = Math.max(c.header.length, ...values.map((v) => v.length));
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, resourceLabel);

  const date = new Date().toISOString().split("T")[0];
  const filename = `${resourceLabel.toLowerCase().replace(/\s+/g, "_")}_${date}.xlsx`;

  XLSX.writeFile(wb, filename);
}
