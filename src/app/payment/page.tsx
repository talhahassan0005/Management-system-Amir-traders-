'use client';

import { useEffect, useMemo, useState } from 'react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import Layout from '@/components/Layout/Layout';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';

type PartyType = 'Customer' | 'Supplier';
type Mode = 'Cash' | 'Bank' | 'Cheque';

interface Option { _id: string; label: string; business?: string }
interface Payment {
  _id?: string;
  voucherNumber?: string;
  date: string;
  partyType: PartyType;
  partyId: string;
  mode: Mode;
  amount: number;
  notes?: string;
}

export default function PaymentPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState<Payment>({
    date: new Date().toISOString().slice(0,10),
    partyType: 'Customer',
    partyId: '',
    mode: 'Cash',
    amount: 0,
    notes: '',
  });

  const [partyInput, setPartyInput] = useState<string>(''); // For autocomplete input

  const partyOptions = useMemo(() => {
    return form.partyType === 'Customer' ? customers : suppliers;
  }, [form.partyType, customers, suppliers]);

  const loadParties = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/customers?limit=1000'),
        fetch('/api/suppliers?limit=1000'),
      ]);
      const [cData, sData] = await Promise.all([cRes.json(), sRes.json()]);
      setCustomers((cData.customers || []).map((c: any) => ({ _id: c._id, label: c.person ? `${c.person} (${c.description})` : c.description })));
      setSuppliers((sData.suppliers || []).map((s: any) => ({ _id: s._id, label: s.person ? `${s.person} (${s.description})` : s.description, business: s.business })));
    } catch (e) {
      console.error('Failed to load parties', e);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setPayments(data.payments || []);
      else console.error('Failed to load payments:', data.error);
    } catch (e) {
      console.error('Error fetching payments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    loadParties();
  }, []);

  const resetForm = () => {
    setSelected(null);
    setForm({ date: new Date().toISOString().slice(0,10), partyType: 'Customer', partyId: '', mode: 'Cash', amount: 0, notes: '' });
    setPartyInput('');
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
      const url = selected?._id ? `/api/payments/${selected._id}` : '/api/payments';
      const method = selected?._id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Failed to save payment'); return; }
      await fetchPayments();
      resetForm();
      setSuccessMsg('Payment saved');
    } catch (e) {
      console.error('Error saving payment:', e);
      setErrorMsg('Unexpected error while saving');
    } finally {
      setSaving(false);
    }
  };

  const edit = (p: Payment) => {
    setSelected(p);
    setForm({
      date: p.date?.slice(0,10) || new Date().toISOString().slice(0,10),
      partyType: p.partyType,
      partyId: p.partyId,
      mode: p.mode,
      amount: p.amount,
      notes: p.notes || '',
      _id: p._id,
      voucherNumber: p.voucherNumber,
    });
    
    // Set party input for autocomplete
    const list = p.partyType === 'Customer' ? customers : suppliers;
    const match = list.find(o => o._id === p.partyId);
    setPartyInput(match?.label || '');
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to delete payment');
        return;
      }
      if (selected?._id === id) resetForm();
      await fetchPayments();
    } catch (e) {
      console.error('Error deleting payment:', e);
      setErrorMsg('Unexpected error while deleting');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-gray-600">Manage customer and supplier payments</p>
          </div>
          {/* New Payment button removed as requested */}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Payment Management Form - Increased width */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto w-full">
            {errorMsg && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200 mb-4">{errorMsg}</div>}
            {successMsg && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200 mb-4">{successMsg}</div>}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Party Type</label>
                <select value={form.partyType} onChange={(e) => {
                  setForm((p) => ({ ...p, partyType: e.target.value as PartyType, partyId: '' }));
                  setPartyInput(''); // Reset party input when type changes
                }} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="Customer">Customer</option>
                  <option value="Supplier">Supplier</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Party</label>
                <input
                  type="text"
                  value={partyInput}
                  onChange={(e) => {
                    setPartyInput(e.target.value);
                    // Find matching party and set partyId
                    const match = partyOptions.find(option => 
                      option.label.toLowerCase().includes(e.target.value.toLowerCase())
                    );
                    setForm(p => ({ ...p, partyId: match?._id || '' }));
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder={`Start typing ${form.partyType.toLowerCase()}...`}
                  list={`${form.partyType.toLowerCase()}-list`}
                  autoComplete="off"
                />
                <datalist id={`${form.partyType.toLowerCase()}-list`}>
                  {partyOptions.map(option => (
                    <option key={option._id} value={option.label} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                <select value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value as Mode }))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value) || 0 }))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <input type="text" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={save} disabled={saving} className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{saving ? 'Saving...' : selected?._id ? 'Update Payment' : 'Save Payment'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Payments Section - Moved to bottom with increased width */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Recent Payments</h3>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No payments found</td></tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.voucherNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.date?.toString()?.slice(0,10)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const list = p.partyType === 'Customer' ? customers : suppliers;
                          const match = list.find(o => o._id === p.partyId);
                          const name = p.partyType === 'Supplier' ? (match?.business || match?.label || p.partyId) : (match?.label || p.partyId);
                          return `${p.partyType}: ${name}`;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.mode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.amount?.toFixed?.(2) || p.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.notes || '-'}</td>
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
