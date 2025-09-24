'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout/Layout';
import { Loader2, Save } from 'lucide-react';

type PartyType = 'Customer' | 'Supplier';
type Mode = 'Cash' | 'Bank' | 'Cheque';

interface Option { _id: string; label: string; }
interface Receipt {
  _id?: string;
  receiptNumber?: string;
  date: string;
  partyType: PartyType;
  partyId: string;
  mode: Mode;
  amount: number;
  notes?: string;
}

export default function ReceiptPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState<Receipt>({
    date: new Date().toISOString().slice(0,10),
    partyType: 'Customer',
    partyId: '',
    mode: 'Cash',
    amount: 0,
    notes: '',
  });
  const [search, setSearch] = useState<string>('');

  const partyOptions = useMemo(() => {
    return form.partyType === 'Customer' ? customers : suppliers;
  }, [form.partyType, customers, suppliers]);

  // Map partyId to party label for quick lookups
  const partyLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => map.set(c._id, c.label));
    suppliers.forEach((s) => map.set(s._id, s.label));
    return map;
  }, [customers, suppliers]);

  // Filter receipts by free-text search: receipt #, date, mode, party type/name, or amount
  const filteredReceipts = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return receipts;
    return receipts.filter((p) => {
      const rn = String(p.receiptNumber || '').toLowerCase();
      const date = String(p.date || '').slice(0, 10).toLowerCase();
      const mode = String(p.mode || '').toLowerCase();
      const ptype = String(p.partyType || '').toLowerCase();
      const plabel = (partyLabelMap.get(p.partyId) || '').toLowerCase();
      const amt = String(p.amount || '').toLowerCase();
      return rn.includes(q) || date.includes(q) || mode.includes(q) || ptype.includes(q) || plabel.includes(q) || amt.includes(q);
    });
  }, [receipts, search, partyLabelMap]);

  const loadParties = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/customers?limit=1000'),
        fetch('/api/suppliers?limit=1000'),
      ]);
      const [cData, sData] = await Promise.all([cRes.json(), sRes.json()]);
      setCustomers((cData.customers || []).map((c: any) => ({ _id: c._id, label: c.description })));
      setSuppliers((sData.suppliers || []).map((s: any) => ({ _id: s._id, label: s.person ? `${s.person} (${s.description})` : s.description })));
    } catch (e) {
      console.error('Failed to load parties', e);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/receipts');
      const data = await res.json();
      if (res.ok) setReceipts(data.receipts || []);
      else console.error('Failed to load receipts:', data.error);
    } catch (e) {
      console.error('Error fetching receipts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
    loadParties();
  }, []);

  const resetForm = () => {
    setSelected(null);
    setForm({ date: new Date().toISOString().slice(0,10), partyType: 'Customer', partyId: '', mode: 'Cash', amount: 0, notes: '' });
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const save = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      if (!form.partyId) { setErrorMsg('Please select a party'); return; }
      if (!form.amount || form.amount <= 0) { setErrorMsg('Amount must be greater than 0'); return; }
      const payload = { ...form, date: new Date(form.date).toISOString() };
      const url = selected?._id ? `/api/receipts/${selected._id}` : '/api/receipts';
      const method = selected?._id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Failed to save receipt'); return; }
      await fetchReceipts();
      resetForm();
      setSuccessMsg('Receipt saved');
    } catch (e) {
      console.error('Error saving receipt:', e);
      setErrorMsg('Unexpected error while saving');
    } finally {
      setSaving(false);
    }
  };

  const edit = (p: Receipt) => {
    setSelected(p);
    setForm({
      date: p.date?.slice(0,10) || new Date().toISOString().slice(0,10),
      partyType: p.partyType,
      partyId: p.partyId,
      mode: p.mode,
      amount: p.amount,
      notes: p.notes || '',
      _id: p._id,
      receiptNumber: p.receiptNumber,
    });
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to delete receipt');
        return;
      }
      if (selected?._id === id) resetForm();
      await fetchReceipts();
    } catch (e) {
      console.error('Error deleting receipt:', e);
      setErrorMsg('Unexpected error while deleting');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipt Management</h1>
            <p className="text-gray-600">Manage receipts and payment confirmations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              {errorMsg && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">{errorMsg}</div>}
              {successMsg && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">{successMsg}</div>}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Party Type</label>
                  <select value={form.partyType} onChange={(e) => setForm((p) => ({ ...p, partyType: e.target.value as PartyType, partyId: '' }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="Customer">Customer</option>
                    <option value="Supplier">Supplier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Party</label>
                  <select value={form.partyId} onChange={(e) => setForm((p) => ({ ...p, partyId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Select {form.partyType}</option>
                    {partyOptions.map((o) => (<option key={o._id} value={o._id}>{o.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                  <select value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value as Mode }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value) || 0 }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <input type="text" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={save} disabled={saving} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>{saving ? 'Saving...' : selected?._id ? 'Update Receipt' : 'Save Receipt'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Receipts moved to bottom as full-width section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Receipts</h3>
          </div>
          <div className="mb-3 flex items-end gap-2">
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Receipt #, party, mode, amount..."
              />
            </div>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-6 h-10 px-3 rounded-lg border bg-gray-50 hover:bg-gray-100 text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : receipts.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No receipts found</td></tr>
                ) : (
                  filteredReceipts.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.receiptNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.date?.toString()?.slice(0,10)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{p.partyType}</span>
                          <span className="text-gray-600 text-xs">{partyLabelMap.get(p.partyId) || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.mode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.amount?.toFixed?.(2) || p.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => edit(p)} className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button onClick={() => p._id && remove(p._id)} className="text-red-600 hover:text-red-900">Delete</button>
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
