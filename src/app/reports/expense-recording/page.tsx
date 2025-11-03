"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import Filter from '@/components/Reports/Filter';
import { Download, Printer } from 'lucide-react';
import { downloadCSV, printReport } from '@/lib/report-utils';

export default function ExpenseRecording() {
  const [filters, setFilters] = useState<any>({});
  const [rows, setRows] = useState<any[]>([]);

  const handleDownload = () => {
    downloadCSV(rows || [], 'expense-recording');
  };

  useEffect(() => {
    const q = new URLSearchParams(filters as any).toString();
    fetch(`/api/reports/expense-recording${q ? `?${q}` : ''}`)
      .then(r => r.json())
      .then(d => setRows(d.rows || []))
      .catch(() => setRows([]));
  }, [filters]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Recording</h1>
            <p className="text-gray-600">Record and review expenses</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">No expense data available</td>
                  </tr>
                ) : (
                  rows.map((r:any,i:number)=> (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.category}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{r.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{r.amount?.toLocaleString()}</td>
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


