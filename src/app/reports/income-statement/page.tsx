"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import Filter from '@/components/Reports/Filter';
import { Download, Printer } from 'lucide-react';
import { downloadCSV, printReport } from '@/lib/report-utils';

export default function IncomeStatement() {
  const [filters, setFilters] = useState<any>({});
  const [data, setData] = useState<any>({});

  const handleDownload = () => {
    const exportData = [
      { category: 'Total Revenue', amount: data.revenue || 0 },
      { category: 'COGS', amount: data.cogs || 0 },
      { category: 'Gross Profit', amount: data.grossProfit || 0 },
      ...(data.operatingExpenses != null ? [{ category: 'Operating Expenses', amount: data.operatingExpenses }] as any : []),
      { category: 'Net Profit', amount: data.netProfit || 0 }
    ];
    downloadCSV(exportData, 'income-statement');
  };

  useEffect(() => {
    const q = new URLSearchParams(filters as any).toString();
    fetch(`/api/reports/income-statement${q ? `?${q}` : ''}`)
      .then(r => r.json())
      .then(d => setData(d || {}))
      .catch(() => setData({}));
  }, [filters]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Income Statement</h1>
            <p className="text-gray-600">Revenue, Cost and Profit over selected period</p>
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
          show={{ from: true, to: true, store: true, product: false, customer: false }}
          initial={{ from: '', to: new Date().toISOString().split('T')[0] }}
        />

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Profit & Loss Statement</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="bg-green-50">
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">Revenue</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{data.revenue?.toLocaleString() || '0'}</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">Cost of Goods Sold</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{data.cogs?.toLocaleString() || '0'}</td>
                </tr>
                <tr className="bg-yellow-50">
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">Gross Profit</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{data.grossProfit?.toLocaleString() || '0'}</td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">Net Profit</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{data.netProfit?.toLocaleString() || '0'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

