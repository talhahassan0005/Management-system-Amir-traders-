"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import Filter from '@/components/Reports/Filter';
import { Download, Printer, Share2 } from 'lucide-react';
import { downloadCSV, printReport } from '@/lib/report-utils';

export default function Receivables() {
  const [filters, setFilters] = useState<any>({});
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleDownload = () => {
    downloadCSV(rows || [], 'receivables-summary');
  };

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams(filters as any).toString();
    fetch(`/api/reports/receivables${q ? `?${q}` : ''}`)
      .then(r => r.json())
      .then(d => setRows(d.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [filters]);

  const fmt = (n: number | null | undefined) =>
    Number.isFinite(Number(n)) ? Number(n).toLocaleString() : '0';

  // Normalize phone to WhatsApp-friendly international format.
  // Defaults to PK if local mobile formats are detected (e.g., 03xxxxxxxxx or 3xxxxxxxxx).
  const normalizeWhatsAppPhone = (p: string): string => {
    let d = (p || '').replace(/\D/g, '');
    if (!d) return '';
    // Convert common prefixes
    if (d.startsWith('0092')) d = '92' + d.slice(4);
    // Local mobile patterns -> convert to 92xxxxxxxxxx
    if (d.startsWith('0') && d.length === 11) return '92' + d.slice(1); // 03xxxxxxxxx
    if (!d.startsWith('0') && d.length === 10 && d[0] === '3') return '92' + d; // 3xxxxxxxxx
    // Already in E.164 (Pakistan)
    if (d.startsWith('92') && d.length === 12) return d;
    // Otherwise, if looks like international with country code, keep as-is (8-15 digits typical range)
    if (!d.startsWith('0') && d.length >= 8 && d.length <= 15) return d;
    return d; // fallback (may still work)
  };

  const handleShareRow = (r: any) => {
    const toDate = filters?.to || new Date().toISOString().split('T')[0];
    const name = r.customer || 'Customer';
    const header = `Assalam o Alaikum ${name},`;
    const body = `\nAap ka receivable summary (as of ${toDate}):\nTotal Invoiced: ${fmt(r.totalInvoiced)}\nAmount Received: ${fmt(r.amountReceived)}\nBalance Due: ${fmt(r.balanceDue)}`;
    const footer = `\n— Sent from Amir Traders Management System`;
    const text = `${header}${body}${footer}`;
    const normalized = String(r.waPhone || '') || normalizeWhatsAppPhone(String(r.phone || ''));
    if (!normalized) {
      if (typeof window !== 'undefined') {
        window.alert('Customer phone number not found. Please add a mobile number in the customer profile.');
      }
      return;
    }
    // Use wa.me format which works more reliably across desktop/web/mobile
    const url = `https://wa.me/${encodeURIComponent(normalized)}?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') window.open(url, '_blank');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receivables</h1>
            <p className="text-gray-600">Outstanding customer receivables</p>
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
          <div className="overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                <span className="text-sm text-gray-600">Loading…</span>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Invoiced</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Received</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Due</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                      No receivables data available
                    </td>
                  </tr>
                ) : (
                  rows.map((r:any,i:number)=> (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.customer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{(r.totalInvoiced ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{(r.amountReceived ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{(r.balanceDue ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        <button
                          onClick={() => handleShareRow(r)}
                          disabled={!r.waPhone && !r.phone}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                          title={r.waPhone || r.phone ? `WhatsApp ${(r.waPhone || r.phone)}` : 'No phone number on file'}
                        >
                          <Share2 size={16} />
                          WhatsApp
                        </button>
                      </td>
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


