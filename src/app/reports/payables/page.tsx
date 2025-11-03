"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import Filter from '@/components/Reports/Filter';
import { Download, Printer } from 'lucide-react';
import { downloadCSV, printReport } from '@/lib/report-utils';

export default function Payables() {
  const [filters, setFilters] = useState<any>({});
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleDownload = () => {
    downloadCSV(rows || [], 'payables');
  };

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams(filters as any).toString();
    fetch(`/api/reports/payables${q ? `?${q}` : ''}`)
      .then(r => r.json())
      .then(d => setRows(d.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payables</h1>
            <p className="text-gray-600">Outstanding supplier payables</p>
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
          show={{ from: true, to: true, product: true, store: true, customer: true, supplier: true }}
          initial={{ from: '', to: new Date().toISOString().split('T')[0] }}
        />

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                <span className="text-sm text-gray-600">Loading…</span>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Purchased</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Due</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      No payables data available
                    </td>
                  </tr>
                ) : (
                  rows.map((r:any,i:number)=> (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.supplier}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{(r.totalPurchased ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{(r.amountPaid ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{(r.balanceDue ?? 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

