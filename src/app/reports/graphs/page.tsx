"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import Filter from '@/components/Reports/Filter';
import { Download, Printer } from 'lucide-react';
import { downloadCSV, printReport } from '@/lib/report-utils';
import Bar from '@/components/Reports/Charts/BarChart';
import Line from '@/components/Reports/Charts/LineChart';
import Pie from '@/components/Reports/Charts/PieChart';

export default function GraphsReport() {
  const [filters, setFilters] = useState<any>({});
  const [barData, setBarData] = useState<any[]>([]);
  const [lineData, setLineData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  const handleDownload = () => {
    const exportData = [
      ...barData.map((d: any) => ({ type: 'Bar', ...d })),
      ...lineData.map((d: any) => ({ type: 'Line', ...d })),
      ...pieData.map((d: any) => ({ type: 'Pie', ...d }))
    ];
    downloadCSV(exportData, 'graphs');
  };

  useEffect(() => {
    // fetch sample data from API stub
    const q = new URLSearchParams(filters as any).toString();
    fetch(`/api/reports/graphs${q ? `?${q}` : ''}`)
      .then((r) => r.json())
      .then((d) => {
        setBarData(d.bar || []);
        setLineData(d.line || []);
        setPieData(d.pie || []);
      })
      .catch(() => {});
  }, [filters]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Graphs & Analytics</h1>
            <p className="text-gray-600">Visual insights across sales, profit and inventory</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Sales (Bar)</h3>
            <Bar data={barData} dataKey="value" xKey="name" />
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Sales Trend (Line)</h3>
            <Line data={lineData} dataKey="value" xKey="name" />
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Category Distribution (Pie)</h3>
            <Pie data={pieData} dataKey="value" nameKey="name" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

