"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import Filter from '@/components/Reports/Filter';
import { Download, Printer, Share2 } from 'lucide-react';
import { downloadCSV, printReport } from '@/lib/report-utils';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function InventoryValuationDetailed() {
  const [filters, setFilters] = useState<any>({});
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [costMode, setCostMode] = useState<'latest' | 'wac'>('latest');
  const [basis, setBasis] = useState<'qty' | 'weight'>('qty');
  const [serverTotals, setServerTotals] = useState<{ quantity: number; weight: number; totalValue: number } | null>(null);
  const [exportingAll, setExportingAll] = useState<boolean>(false);
  const LIMIT = 100;

  // Formatters for consistent display
  const fmtInt = (n: number | null | undefined) =>
    Number.isFinite(Number(n)) ? Math.round(Number(n)).toLocaleString() : '-';
  const fmtDec2 = (n: number | null | undefined) =>
    Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';

  const totals = React.useMemo(() => {
    const tQty = rows.reduce((s, r) => s + Number(r.quantity || 0), 0);
    const tWeight = rows.reduce((s, r) => s + Number(r.weight || 0), 0);
    const tValue = rows.reduce((s, r) => s + Number(r.totalValue || 0), 0);
    return { quantity: tQty, weight: tWeight, totalValue: tValue };
  }, [rows]);

  const fetchPage = async (pg: number, replace = false) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ ...filters, cost: costMode, basis, page: String(pg), limit: String(LIMIT) } as any);
      const res = await fetch(`/api/reports/inventory-valuation-detailed?${sp.toString()}`);
      const data = await res.json();
      const newRows = Array.isArray(data.rows) ? data.rows : [];
      setRows(prev => (replace ? newRows : [...prev, ...newRows]));
      setHasMore(!!data?.pagination?.hasMore);
      setPage(pg);
      if (replace) {
        setServerTotals(data?.totals ?? null);
      }
    } catch {
      if (replace) setRows([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Refetch when filters or cost mode change
  useEffect(() => {
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, costMode, basis]);

  const handleDownload = () => {
    const effectiveTotals = serverTotals ?? totals;
    const meta = buildExportMeta({ costMode, basis, filters });
    const withTotals = [
      ...rows,
      { product: 'TOTAL', store: '', lot: '', quantity: effectiveTotals.quantity, weight: effectiveTotals.weight, unitCost: '', totalValue: effectiveTotals.totalValue },
    ];
    downloadCSV(withTotals, 'inventory-valuation-detailed', { prependRows: [meta] });
  };

  const handleExportAll = async () => {
    try {
      setExportingAll(true);
      const allRows: any[] = [];
      let pg = 1;
      let hasMoreLocal = true;
      let apiTotals: any = null;
      while (hasMoreLocal) {
        const sp = new URLSearchParams({ ...filters, cost: costMode, basis, page: String(pg), limit: String(LIMIT) } as any);
        const res = await fetch(`/api/reports/inventory-valuation-detailed?${sp.toString()}`);
        if (!res.ok) break;
        const data = await res.json();
        if (pg === 1) apiTotals = data?.totals ?? null;
        const batch = Array.isArray(data.rows) ? data.rows : [];
        allRows.push(...batch);
        hasMoreLocal = !!data?.pagination?.hasMore;
        pg += 1;
        if (!batch.length) break; // safety
      }

      const effectiveTotals = apiTotals ?? allRows.reduce((acc, r) => {
        acc.quantity += Number(r.quantity || 0);
        acc.weight += Number(r.weight || 0);
        acc.totalValue += Number(r.totalValue || 0);
        return acc;
      }, { quantity: 0, weight: 0, totalValue: 0 });

      const meta = buildExportMeta({ costMode, basis, filters });
      const withTotals = [
        ...allRows,
        { product: 'TOTAL', store: '', lot: '', quantity: effectiveTotals.quantity, weight: effectiveTotals.weight, unitCost: '', totalValue: effectiveTotals.totalValue },
      ];
      downloadCSV(withTotals, 'inventory-valuation-detailed', { prependRows: [meta] });
    } finally {
      setExportingAll(false);
    }
  };

  const handleShareWhatsApp = () => {
    // Build a concise text summary for WhatsApp
    const effectiveTotals = serverTotals ?? totals;
    const meta = buildExportMeta({ costMode, basis, filters });
    const header = `Inventory Valuation (detailed)\n${meta}`;
    const colHead = ['Product', 'Store', 'Lot', 'Qty', 'Weight', basis === 'weight' ? 'Unit Cost/kg' : 'Unit Cost', 'Total'].join(' | ');
    const maxLines = 20; // limit to avoid overly long messages
    const lines = rows.slice(0, maxLines).map((r: any) => [
      String(r.product || '-'),
      String(r.store || '-'),
      String(r.lot || '-'),
      fmtInt(r.quantity),
      fmtDec2(r.weight),
      fmtDec2(r.unitCost),
      fmtDec2(r.totalValue),
    ].join(' | '));
    const moreNote = rows.length > maxLines ? `\n…and ${rows.length - maxLines} more rows` : '';
    const totalsLine = `Totals: Qty ${fmtInt(effectiveTotals.quantity)} | Weight ${fmtDec2(effectiveTotals.weight)} | Value ${fmtDec2(effectiveTotals.totalValue)}`;
    const footer = `\nShared via Management System`;
    const text = [header, '', colHead, ...lines, moreNote, '', totalsLine, footer]
      .filter(Boolean)
      .join('\n');

    // Ask for phone number (optional); if absent, open generic share
    const rawPhone = typeof window !== 'undefined' ? window.prompt('Enter WhatsApp number with country code (e.g., 923001234567). Leave blank to choose contact in WhatsApp.') : '';
    const phone = (rawPhone || '')
      .replace(/[^0-9]/g, '') // digits only
      .trim();

    const base = 'https://api.whatsapp.com/send';
    const url = phone
      ? `${base}?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`
      : `${base}?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') window.open(url, '_blank');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Valuation (detailed)</h1>
            <p className="text-gray-600">Detailed valuation with lot-level details</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2 mr-2">
              <label htmlFor="costMode" className="text-sm text-gray-600">Cost</label>
              <select
                id="costMode"
                value={costMode}
                onChange={(e) => setCostMode(e.target.value as any)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                title="Choose cost method"
              >
                <option value="latest">Latest Purchase</option>
                <option value="wac">Weighted Avg (WAC)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mr-2">
              <label htmlFor="valueBasis" className="text-sm text-gray-600">Value Basis</label>
              <select
                id="valueBasis"
                value={basis}
                onChange={(e) => setBasis(e.target.value as any)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                title="Choose value basis"
              >
                <option value="qty">Per Quantity</option>
                <option value="weight">Per Weight</option>
              </select>
            </div>
            <button
              onClick={handleShareWhatsApp}
              disabled={rows.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-800 focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:opacity-50"
              title="Share via WhatsApp"
            >
              <Share2 size={18} />
              Share
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <Download size={18} />
              Download CSV
            </button>
            <button
              onClick={handleExportAll}
              disabled={exportingAll}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Download size={18} />
              {exportingAll ? 'Exporting…' : 'Export All Pages'}
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Printer size={18} />
              Print
            </button>
          </div>
        </div>

        <Filter
          onChange={setFilters}
          show={{ product: false, store: true, customer: false, from: true, to: true }}
          initial={{ from: '', to: new Date().toISOString().split('T')[0] }}
        />

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20">
                <LoadingSpinner />
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot/Batch</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{basis === 'weight' ? 'Unit Cost (per kg)' : 'Unit Cost'}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                      No detailed inventory data available
                    </td>
                  </tr>
                ) : (
                  rows.map((row: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.product || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.store || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.lot || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {fmtInt(row.quantity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {fmtDec2(row.weight)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {fmtDec2(row.unitCost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {fmtDec2(row.totalValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-gray-50 sticky bottom-0 z-10">
                  <tr>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900" colSpan={3}>Totals</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{fmtInt((serverTotals ?? totals).quantity)}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{fmtDec2((serverTotals ?? totals).weight)}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">-</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{fmtDec2((serverTotals ?? totals).totalValue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {rows.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-6 text-sm text-gray-900">
              <div><span className="font-semibold">Totals:</span></div>
              <div>Qty: <span className="font-semibold">{fmtInt((serverTotals ?? totals).quantity)}</span></div>
              <div>Weight: <span className="font-semibold">{fmtDec2((serverTotals ?? totals).weight)}</span></div>
              <div>Value: <span className="font-semibold">{fmtDec2((serverTotals ?? totals).totalValue)}</span></div>
            </div>
          )}
          {hasMore && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-center">
              <button
                onClick={() => fetchPage(page + 1)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Build the CSV header meta line
function buildExportMeta({ costMode, basis, filters }: { costMode: 'latest' | 'wac'; basis: 'qty' | 'weight'; filters: any }) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const mode = costMode === 'wac' ? 'WAC' : 'Latest';
  const basisLabel = basis === 'weight' ? 'Per Weight' : 'Per Quantity';
  const parts = [
    `Exported on: ${timestamp}`,
    `Mode: ${mode}`,
    `Value Basis: ${basisLabel}`,
  ];
  if (filters?.store) parts.push(`Store: ${filters.store}`);
  if (filters?.product) parts.push(`Product: ${filters.product}`);
  if (filters?.to) parts.push(`To: ${filters.to}`);
  return parts.join(' | ');
}


