'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout/Layout';
import { Save, Edit, Trash2, RefreshCw, Search } from 'lucide-react';

interface StoreDoc {
  _id?: string;
  store: string;
  description: string;
  status: 'Active' | 'Inactive';
}

export default function StorePage() {
  const [stores, setStores] = useState<StoreDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StoreDoc>({ store: '', description: '', status: 'Active' });
  const [selected, setSelected] = useState<StoreDoc | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'All' | 'Active' | 'Inactive'>('All');

  const fetchStores = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status !== 'All') params.append('status', status);
      const res = await fetch(`/api/stores?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setStores(data.stores || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStores(); }, [search, status]);

  const reset = () => { setSelected(null); setForm({ store: '', description: '', status: 'Active' }); };

  const save = async () => {
    try {
      setSaving(true);
      const body = JSON.stringify(form);
      const res = await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (res.ok) { reset(); fetchStores(); }
    } finally { setSaving(false); }
  };

  const edit = async () => {
    if (!selected?._id) return;
    const res = await fetch(`/api/stores/${selected._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { reset(); fetchStores(); }
  };

  const remove = async () => {
    if (!selected?._id) return;
    const res = await fetch(`/api/stores/${selected._id}`, { method: 'DELETE' });
    if (res.ok) { reset(); fetchStores(); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Store Information</h1>
            <p className="text-gray-600">Manage stores and their status</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchStores} className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Store</label>
                <input value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={save} disabled={saving || !!selected} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:bg-gray-300"><Save className="w-4 h-4" /> Save</button>
                <button onClick={edit} disabled={!selected} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-gray-300"><Edit className="w-4 h-4" /> Edit</button>
                <button onClick={remove} disabled={!selected} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 disabled:bg-gray-300 col-span-2"><Trash2 className="w-4 h-4" /> Remove</button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by store or description" className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
              </div>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900">
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-600">Loading...</td></tr>
                  ) : stores.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-600">No stores</td></tr>
                  ) : (
                    stores.map(s => (
                      <tr key={s._id} className={`hover:bg-blue-50 cursor-pointer ${selected?._id === s._id ? 'bg-blue-50' : ''}`} onClick={() => { setSelected(s); setForm({ store: s.store, description: s.description, status: s.status }); }}>
                        <td className="px-6 py-3 text-sm text-gray-900">{s.store}</td>
                        <td className="px-6 py-3 text-sm text-gray-900">{s.description}</td>
                        <td className="px-6 py-3 text-sm text-gray-900">{s.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}


