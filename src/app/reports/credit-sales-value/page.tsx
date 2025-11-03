"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import Filter from '@/components/Reports/Filter';
import { Download, Printer } from 'lucide-react';
import { downloadCSV, printReport } from '@/lib/report-utils';

export default function CreditSalesValue() {
  const [filters, setFilters] = useState<any>({});
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const total = React.useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);
  const totalBalance = React.useMemo(() => rows.reduce((s, r) => s + Number(r.balance || 0), 0), [rows]);

  const handleDownload = () => {
    downloadCSV(rows || [], 'credit-sales-value');
  };

  useEffect(() => {
    const q = new URLSearchParams(filters as any).toString();
    setLoading(true);
    fetch(`/api/reports/credit-sales-value${q ? `?${q}` : ''}`)
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d.rows) ? d.rows : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Credit Sales Value</h1>
            <p className="text-gray-600">Total value of credit sales</p>
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
          show={{ product: true, store: true, customer: true, from: true, to: true }}
          initial={{ from: '', to: new Date().toISOString().split('T')[0] }}
        />

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20">
                <span className="text-sm text-gray-600">Loading…</span>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                      No credit sales data available for selected period
                    </td>
                  </tr>
                ) : (
                  rows.map((row: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.invoiceNo || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.customer || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {row.amount != null ? row.amount.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {row.balance != null ? row.balance.toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900" colSpan={3}>Totals</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{total.toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{totalBalance.toLocaleString()}</td>
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


