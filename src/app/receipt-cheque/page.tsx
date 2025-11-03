'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout/Layout';
import { Loader2, Plus, Save } from 'lucide-react';

type Status = 'Due' | 'Paid' | 'Bounced';
type PartyType = 'Customer' | 'Supplier';

interface Option { _id: string; label: string; }
interface Cheque {
  _id?: string;
  chequeNumber?: string;
  chequeNo: string;
  bank: string;
  partyType: PartyType;
  partyId: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: Status;
  notes?: string;
}

export default function ReceiptChequePage() {
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Cheque | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>(new Date().toISOString().slice(0, 10));

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const PAGE_LIMIT = 20;


  const [form, setForm] = useState<Cheque>({
    chequeNo: '', bank: '', partyType: 'Customer', partyId: '', amount: 0, issueDate: new Date().toISOString().slice(0,10), dueDate: new Date().toISOString().slice(0,10), status: 'Due', notes: ''
  });

  const partyOptions = useMemo(() => customers, [customers]);

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/customers?limit=1000');
      const data = await res.json();
      setCustomers((data.customers || []).map((c: any) => ({ _id: c._id, label: c.description })));
    } catch (e) { console.error('Failed to load customers', e); }
  };

  const fetchCheques = async (isNewSearch = false) => {
    if (isFetching) return;
    setIsFetching(true);
    setLoading(true);

    const currentPage = isNewSearch ? 1 : page;
    const params = new URLSearchParams();
    params.set('partyType', 'Customer');
    if (statusFilter !== 'All') params.set('status', statusFilter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('page', currentPage.toString());
    params.set('limit', PAGE_LIMIT.toString());

    try {
      const res = await fetch(`/api/cheques?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setCheques(prev => isNewSearch ? data.cheques : [...prev, ...data.cheques]);
        setHasMore(data.pagination.hasMore);
        if (isNewSearch) {
          setPage(2);
        } else {
          setPage(prev => prev + 1);
        }
      } else {
        console.error('Failed to load cheques:', data.error);
        setErrorMsg(data.error || 'Failed to fetch cheques.');
      }
    } catch (e) {
      console.error('Error fetching cheques:', e);
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchCheques(true); 
    loadCustomers(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { 
    fetchCheques(true); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, from, to]);

  const resetForm = () => {
    setSelected(null);
    setForm({ chequeNo: '', bank: '', partyType: 'Customer', partyId: '', amount: 0, issueDate: new Date().toISOString().slice(0,10), dueDate: new Date().toISOString().slice(0,10), status: 'Due', notes: '' });
    setErrorMsg(null); setSuccessMsg(null);
  };

  const save = async () => {
    try {
      setSaving(true); setErrorMsg(null); setSuccessMsg(null);
      if (!form.chequeNo || !form.bank) { setErrorMsg('Cheque # and Bank are required'); return; }
      if (!form.partyId) { setErrorMsg('Please select a customer'); return; }
      if (!form.amount || form.amount <= 0) { setErrorMsg('Amount must be greater than 0'); return; }
      const payload = { ...form, partyType: 'Customer', issueDate: new Date(form.issueDate).toISOString(), dueDate: new Date(form.dueDate).toISOString() };
      const url = selected?._id ? `/api/cheques/${selected._id}` : '/api/cheques';
      const method = selected?._id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Failed to save cheque'); return; }
      await fetchCheques(true); resetForm(); setSuccessMsg('Cheque saved');
    } catch (e) { console.error('Error saving cheque:', e); setErrorMsg('Unexpected error while saving'); }
    finally { setSaving(false); }
  };

  const edit = (c: Cheque) => {
    setSelected(c);
    setForm({ chequeNo: c.chequeNo, bank: c.bank, partyType: 'Customer', partyId: c.partyId, amount: c.amount, issueDate: c.issueDate?.slice(0,10), dueDate: c.dueDate?.slice(0,10), status: c.status, notes: c.notes || '', _id: c._id, chequeNumber: c.chequeNumber });
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/cheques/${id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); setErrorMsg(err.error || 'Failed to delete'); return; }
      if (selected?._id === id) resetForm();
      await fetchCheques(true);
    } catch (e) { console.error('Error deleting cheque:', e); setErrorMsg('Unexpected error while deleting'); }
  };

  const mark = async (id: string, status: Status) => {
    try {
      const res = await fetch(`/api/cheques/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) { const err = await res.json(); setErrorMsg(err.error || 'Failed to update status'); return; }
      await fetchCheques(true);
    } catch (e) { console.error('Error updating status:', e); setErrorMsg('Unexpected error while updating'); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipt Cheque Management</h1>
            <p className="text-gray-600">Manage customer receipt cheques</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              {errorMsg && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">{errorMsg}</div>}
              {successMsg && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">{successMsg}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cheque #</label>
                  <input type="text" value={form.chequeNo} onChange={(e)=>setForm(p=>({...p, chequeNo:e.target.value}))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bank Cheque No" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank</label>
                  <input type="text" value={form.bank} onChange={(e)=>setForm(p=>({...p, bank:e.target.value}))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bank name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                  <select value={form.partyId} onChange={(e)=>setForm(p=>({...p, partyId:e.target.value}))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Customer</option>
                    {partyOptions.map((o)=> (<option key={o._id} value={o._id}>{o.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                  <input type="date" value={form.issueDate} onChange={(e)=>setForm(p=>({...p, issueDate:e.target.value}))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e)=>setForm(p=>({...p, dueDate:e.target.value}))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input type="number" value={form.amount} onChange={(e)=>setForm(p=>({...p, amount:Number(e.target.value)||0}))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <input type="text" value={form.notes} onChange={(e)=>setForm(p=>({...p, notes:e.target.value}))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={save} disabled={saving} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>{saving ? 'Saving...' : selected?._id ? 'Update Cheque' : 'Save Cheque'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Receipt Cheques</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)} className="px-3 py-2 border rounded-lg text-sm">
                <option value="All">All Status</option>
                <option value="Due">Due</option>
                <option value="Paid">Paid</option>
                <option value="Bounced">Bounced</option>
              </select>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" placeholder="From" />
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" placeholder="To" />
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cheque</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading && cheques.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                  ) : cheques.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No cheques found</td></tr>
                  ) : (
                    cheques.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{c.chequeNo}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{c.bank}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{c.dueDate?.toString()?.slice(0,10)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{c.amount?.toFixed?.(2) || c.amount}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => edit(c)} className="text-blue-600 hover:text-blue-900">Edit</button>
                            <button onClick={() => c._id && remove(c._id)} className="text-red-600 hover:text-red-900">Delete</button>
                            {c.status !== 'Paid' && (<button onClick={() => c._id && mark(c._id, 'Paid')} className="text-green-600 hover:text-green-800">Paid</button>)}
                            {c.status !== 'Bounced' && (<button onClick={() => c._id && mark(c._id, 'Bounced')} className="text-yellow-700 hover:text-yellow-900">Bounce</button>)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={() => fetchCheques()}
                    disabled={isFetching}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400"
                  >
                    {isFetching ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}