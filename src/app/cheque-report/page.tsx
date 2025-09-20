'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout/Layout';

type Status = 'Due' | 'Paid' | 'Bounced';
type PartyType = 'Customer' | 'Supplier';
interface Cheque { _id: string; chequeNumber: string; chequeNo: string; bank: string; partyType: PartyType; partyId: string; amount: number; issueDate?: string; dueDate?: string; status: Status; notes?: string; }

export default function ChequeReportPage() {
  const [items, setItems] = useState<Cheque[]>([]);
  const [status, setStatus] = useState<'' | Status>('');
  const [partyType, setPartyType] = useState<'' | PartyType>('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (partyType) params.set('partyType', partyType);
    if (q) params.set('q', q);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('limit', '500');
    return params.toString();
  };

  const fetchData = async () => {
    try {
      setLoading(true); setErrorMsg(null);
      const res = await fetch(`/api/cheques?${buildQuery()}`);
      const data = await res.json();
      if (res.ok) setItems(data.cheques || []);
      else setErrorMsg(data.error || 'Failed to load report');
    } catch (e) { setErrorMsg('Unexpected error while loading'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const total = useMemo(() => items.reduce((s, c) => s + (Number(c.amount) || 0), 0), [items]);

  const exportCSV = () => {
    const header = ['Cheque Number','Cheque No','Bank','Party Type','Party Id','Issue Date','Due Date','Status','Amount','Notes'];
    const rows = items.map(c => [c.chequeNumber, c.chequeNo, c.bank, c.partyType, c.partyId, c.issueDate?.toString()?.slice(0,10) || '', c.dueDate?.toString()?.slice(0,10) || '', c.status, String(c.amount ?? ''), c.notes ?? '']);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cheque-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cheque Report</h1>
            <p className="text-gray-600">Filter, analyze, and export cheque data</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Refresh</button>
            <button onClick={exportCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">Export CSV</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">All</option>
                <option value="Due">Due</option>
                <option value="Paid">Paid</option>
                <option value="Bounced">Bounced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Party Type</label>
              <select value={partyType} onChange={e=>setPartyType(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">All</option>
                <option value="Customer">Customer</option>
                <option value="Supplier">Supplier</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cheque No / Bank / Notes" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="flex items-end">
              <button onClick={fetchData} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Apply</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {errorMsg && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200 mb-4">{errorMsg}</div>}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cheque No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No records</td></tr>
                ) : (
                  items.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.chequeNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.chequeNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.bank}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.partyType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.issueDate?.toString()?.slice(0,10)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.dueDate?.toString()?.slice(0,10)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{c.amount?.toFixed?.(2) || c.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-6 py-3 text-right font-semibold">Total</td>
                  <td className="px-6 py-3 text-right font-semibold">{total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
