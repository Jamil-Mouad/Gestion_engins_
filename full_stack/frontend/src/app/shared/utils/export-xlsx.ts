import * as XLSX from 'xlsx';

export interface ExportColumn {
  id: string;
  label: string;
}

export function exportToXlsx(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
): void {
  const header = columns.map(c => c.label);
  const data = rows.map(row => columns.map(c => row[c.id] ?? ''));
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
