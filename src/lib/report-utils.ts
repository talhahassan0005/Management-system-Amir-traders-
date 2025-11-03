// Utility functions for report export and printing

export const downloadCSV = (
  data: any[],
  filename: string,
  options?: {
    prependRows?: (string | string[])[]; // optional meta rows before header
    headers?: string[]; // optional explicit header order
  }
) => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Determine headers: union of keys across all rows unless explicit provided
  const headerSet = new Set<string>();
  for (const row of data) {
    Object.keys(row || {}).forEach((k) => headerSet.add(k));
  }
  const headers = options?.headers?.length ? options.headers : Array.from(headerSet);
  
  // Convert to CSV
  const lines: string[] = [];
  if (options?.prependRows && options.prependRows.length) {
    for (const r of options.prependRows) {
      const cols = Array.isArray(r) ? r : [r];
      lines.push(cols.map((v) => csvEscape(String(v ?? ''))).join(','));
    }
  }
  // header row
  lines.push(headers.map((h) => csvEscape(h)).join(','));
  // data rows
  for (const row of data) {
    const values = headers.map((header) => csvEscape(valueToString(row?.[header])));
    lines.push(values.join(','));
  }
  const csv = lines.join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printReport = () => {
  window.print();
};

// Helpers
function csvEscape(value: string): string {
  if (value == null) return '';
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}
function valueToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}
