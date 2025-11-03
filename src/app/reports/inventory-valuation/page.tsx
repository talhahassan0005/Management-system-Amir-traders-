"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import Filter from '@/components/Reports/Filter';
import { Download, Printer } from 'lucide-react';
import { downloadCSV, printReport } from '@/lib/report-utils';

export default function InventoryValuation() {
  const [filters, setFilters] = useState<any>({});
  const [rows, setRows] = useState<any[]>([]);
  const totals = React.useMemo(() => {
    const qty = rows.reduce((s, r) => s + Number(r.qty || 0), 0);
    const value = rows.reduce((s, r) => s + Number(r.value || 0), 0);
    return { qty, value };
  }, [rows]);

  const fmtInt = (n: number | null | undefined) =>
    Number.isFinite(Number(n)) ? Math.round(Number(n)).toLocaleString() : '-';
  const fmtDec2 = (n: number | null | undefined) =>
    Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';

  useEffect(() => {
    const q = new URLSearchParams(filters as any).toString();
    fetch(`/api/reports/inventory-valuation${q ? `?${q}` : ''}`)
      .then(r => r.json())
      .then(d => setRows(d.rows || []))
      .catch(() => setRows([]));
  }, [filters]);

  const handleDownload = () => {
    downloadCSV(rows, 'inventory-valuation');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Valuation</h1>
            <p className="text-gray-600">Summary of current inventory value per item</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <Download size={18} />
              Download CSV
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
          show={{ from: true, to: true, product: false, store: true, customer: false }}
          initial={{ from: '', to: new Date().toISOString().split('T')[0] }}
        />

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      No data available. Adjust filters or check back later.
                    </td>
                  </tr>
                ) : (
                  rows.map((r:any, i:number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.item}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fmtInt(r.qty)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fmtDec2(r.unitCost)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fmtDec2(r.value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">Totals</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">{fmtInt(totals.qty)}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">-</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">{fmtDec2(totals.value)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
