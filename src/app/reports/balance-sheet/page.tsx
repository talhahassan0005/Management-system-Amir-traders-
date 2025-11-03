"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import Filter from '@/components/Reports/Filter';
import { Download, Printer } from 'lucide-react';
import { downloadCSV, printReport } from '@/lib/report-utils';

export default function BalanceSheet() {
  const [filters, setFilters] = useState<any>({});
  const [data, setData] = useState<any>({});

  const handleDownload = () => {
    const exportData = [
      ...(data.assets || []).map((a: any) => ({ type: 'Asset', account: a.account, amount: a.amount })),
      ...(data.liabilities || []).map((l: any) => ({ type: 'Liability', account: l.account, amount: l.amount })),
      ...(data.equity || []).map((e: any) => ({ type: 'Equity', account: e.account, amount: e.amount }))
    ];
    downloadCSV(exportData, 'balance-sheet');
  };

  useEffect(() => {
    const q = new URLSearchParams(filters as any).toString();
    fetch(`/api/reports/balance-sheet${q ? `?${q}` : ''}`)
      .then(r => r.json())
      .then(d => setData(d || {}))
      .catch(() => setData({}));
  }, [filters]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
            <p className="text-gray-600">Assets, Liabilities and Equity snapshot</p>
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
            <h2 className="text-lg font-semibold text-gray-900">Balance Sheet Summary</h2>
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
                <tr className="bg-blue-50">
                  <td colSpan={2} className="px-6 py-3 text-sm font-bold text-gray-900">ASSETS</td>
                </tr>
                {data.assets && data.assets.length > 0 ? (
                  data.assets.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.account}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.amount?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-sm text-gray-500 text-center">No asset data</td>
                  </tr>
                )}
                <tr className="bg-blue-50">
                  <td colSpan={2} className="px-6 py-3 text-sm font-bold text-gray-900">LIABILITIES</td>
                </tr>
                {data.liabilities && data.liabilities.length > 0 ? (
                  data.liabilities.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.account}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.amount?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-sm text-gray-500 text-center">No liability data</td>
                  </tr>
                )}
                <tr className="bg-blue-50">
                  <td colSpan={2} className="px-6 py-3 text-sm font-bold text-gray-900">EQUITY</td>
                </tr>
                {data.equity && data.equity.length > 0 ? (
                  data.equity.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.account}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.amount?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-sm text-gray-500 text-center">No equity data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}


