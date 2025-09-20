'use client';

import { useEffect, useState } from 'react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import Layout from '@/components/Layout/Layout';

type Status = 'Due' | 'Paid' | 'Bounced';
interface Cheque { _id: string; chequeNo: string; bank: string; amount: number; dueDate?: string; status: Status; }

export default function PaidChequePage() {
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cheques?status=Paid&limit=100');
      const data = await res.json();
      if (res.ok) setCheques(data.cheques || []);
      else setErrorMsg(data.error || 'Failed to load');
    } catch (e) { setErrorMsg('Unexpected error while loading'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCheques(); }, []);

  const updateStatus = async (id: string, status: Status) => {
    const res = await fetch(`/api/cheques/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!res.ok) { const err = await res.json(); setErrorMsg(err.error || 'Failed to update'); return; }
    fetchCheques();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/cheques/${id}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json(); setErrorMsg(err.error || 'Failed to delete'); return; }
    fetchCheques();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paid Cheques</h1>
            <p className="text-gray-600">View and manage paid cheques</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {errorMsg && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200 mb-4">{errorMsg}</div>}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cheque</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : cheques.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No paid cheques</td></tr>
                ) : (
                  cheques.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.chequeNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.bank}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.dueDate?.toString()?.slice(0,10)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.amount?.toFixed?.(2) || c.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => updateStatus(c._id, 'Due')} className="text-blue-600 hover:text-blue-900">Revert to Due</button>
                          <button onClick={() => updateStatus(c._id, 'Bounced')} className="text-yellow-700 hover:text-yellow-900">Mark Bounced</button>
                          <button onClick={() => remove(c._id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </div>
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
