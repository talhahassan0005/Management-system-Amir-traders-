'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout/Layout';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

interface Row {
  store: string;
  itemCode: string;
  description: string;
  brand: string;
  type: string;
  length: number; width: number; grams: number;
  purchasedQty: number; soldQty: number; currentQty: number;
  purchasedWeight: number; soldWeight: number; currentWeight: number;
}

export default function StoreStockPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [store, setStore] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStores = async () => {
    try {
      const res = await fetch('/api/stores?status=Active');
      const data = await res.json();
      if (res.ok) setStores(data.stores || []);
    } catch {}
  };

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (store) params.set('store', store);
      const res = await fetch(`/api/store-stock?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setRows(data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { 
    loadStores();
    
    // Listen for store updates
    const handleStoreUpdate = () => {
      loadStores();
    };
    window.addEventListener('storeUpdated', handleStoreUpdate);
    
    return () => {
      window.removeEventListener('storeUpdated', handleStoreUpdate);
    };
  }, []);
  useEffect(() => { load(); }, [store]);

  // Silent auto-refresh every 10 seconds for real-time stock updates
  useAutoRefresh(() => {
    if (!loading) load();
  }, 10000);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      r.itemCode.toLowerCase().includes(term) ||
      (r.description || '').toLowerCase().includes(term) ||
      (r.brand || '').toLowerCase().includes(term) ||
      (r.store || '').toLowerCase().includes(term)
    );
  }, [rows, q]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Store Stock</h1>
            <p className="text-gray-600">View products available per store</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
              <input list="store-list" value={store} onChange={e=>setStore(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="All stores" />
              <datalist id="store-list">
                {stores.map((s:any) => <option key={s._id || s.store} value={s.store} />)}
              </datalist>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input value={q} onChange={e=>setQ(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Search item/description/brand" />
            </div>
            <div className="flex items-end">
              <button onClick={load} className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Refresh</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-2 py-2 text-left text-xs font-semibold text-gray-900">Store</th>
                  <th className="border px-2 py-2 text-left text-xs font-semibold text-gray-900">Item</th>
                  <th className="border px-2 py-2 text-left text-xs font-semibold text-gray-900">Description</th>
                  <th className="border px-2 py-2 text-left text-xs font-semibold text-gray-900">Brand</th>
                  <th className="border px-2 py-2 text-center text-xs font-semibold text-gray-900">Qty (Purchased / Sold / Current)</th>
                  <th className="border px-2 py-2 text-center text-xs font-semibold text-gray-900">Weight (Purchased / Sold / Current)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No records</td></tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={`${r.store}-${r.itemCode}-${i}`} className="odd:bg-white even:bg-gray-50">
                      <td className="border px-2 py-1 text-xs text-gray-900">{r.store}</td>
                      <td className="border px-2 py-1 text-xs text-gray-900">{r.itemCode}</td>
                      <td className="border px-2 py-1 text-xs text-gray-900">{r.description}</td>
                      <td className="border px-2 py-1 text-xs text-gray-900">{r.brand}</td>
                      <td className="border px-2 py-1 text-xs text-center text-gray-900">
                        {r.purchasedQty} / {r.soldQty} / <span className="font-semibold">{r.currentQty}</span>
                      </td>
                      <td className="border px-2 py-1 text-xs text-center text-gray-900">
                        {r.purchasedWeight.toFixed(4)} / {r.soldWeight.toFixed(4)} / <span className="font-semibold">{r.currentWeight.toFixed(4)}</span>
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


