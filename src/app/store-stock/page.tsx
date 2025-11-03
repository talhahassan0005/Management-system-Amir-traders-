'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Layout from '@/components/Layout/Layout';
import { onStoreUpdated, onStockUpdated } from '@/lib/cross-tab-event-bus';

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

const PAGE_LIMIT = 100;

export default function StoreStockPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [store, setStore] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const loadStores = async () => {
    try {
      const res = await fetch('/api/stores?status=Active');
      const data = await res.json();
      if (res.ok) setStores(data.stores || []);
    } catch {}
  };

  const fetchData = useCallback(async (isNewSearch = false) => {
    if (isFetching) return;
    setIsFetching(true);
    setLoading(true);

    const currentPage = isNewSearch ? 1 : page;
    const params = new URLSearchParams();
    if (store) params.set('store', store);
    params.set('page', String(currentPage));
    params.set('limit', String(PAGE_LIMIT));

    const url = `/api/store-stock?${params.toString()}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('store-stock: server error', res.status, body);
        setRows([]);
        setHasMore(false);
        return;
      }
      const result = await res.json();
      const newRows = result.data || [];
      
      setRows(prev => isNewSearch ? newRows : [...prev, ...newRows]);
      setHasMore(result.pagination?.hasMore || false);
      if (isNewSearch) {
        setPage(2);
      } else {
        setPage(prev => prev + 1);
      }
    } catch (fetchErr) {
      console.error('store-stock: failed to fetch', fetchErr);
      setRows([]);
      setHasMore(false);
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  }, [store, page, isFetching]);

  useEffect(() => { 
    loadStores();
    const unsubscribe = onStoreUpdated(loadStores);
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [store]);

  useEffect(() => {
    const unsub = onStockUpdated(() => {
      if (!isFetching) fetchData(true);
    });
    return unsub;
  }, [store, isFetching, fetchData]);

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

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      fetchData();
    }
  };

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
              <button onClick={() => fetchData(true)} className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={isFetching}>
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </button>
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
                {loading && page === 1 ? (
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
          {hasMore && (
            <div className="p-4 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={isFetching}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isFetching ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}


