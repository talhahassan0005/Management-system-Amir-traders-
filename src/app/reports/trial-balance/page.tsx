"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import Filter from '@/components/Reports/Filter';
import { Download, Printer } from 'lucide-react';
import { downloadCSV, printReport } from '@/lib/report-utils';

export default function TrialBalance() {
  const [filters, setFilters] = useState<any>({});
  const [data, setData] = useState<any>({});

  const handleDownload = () => {
    downloadCSV(data.accounts || [], 'trial-balance');
  };

  useEffect(() => {
    const q = new URLSearchParams(filters as any).toString();
    fetch(`/api/reports/trial-balance${q ? `?${q}` : ''}`)
      .then(r => r.json())
      .then(d => setData(d || {}))
      .catch(() => setData({}));
  }, [filters]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trial Balance</h1>
            <p className="text-gray-600">Trial balance by account</p>
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

        <Filter onChange={setFilters} />

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.accounts && data.accounts.length > 0 ? (
                  data.accounts.map((acc: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{acc.account}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{acc.debit?.toLocaleString() || '0'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{acc.credit?.toLocaleString() || '0'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">No trial balance data available</td>
                  </tr>
                )}
                {data.totalDebit !== undefined && data.totalCredit !== undefined && (
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{data.totalDebit?.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{data.totalCredit?.toLocaleString()}</td>
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


