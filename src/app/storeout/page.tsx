'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout/Layout';

interface Option { _id: string; label: string }

export default function StoreOutPage() {
  const [stores, setStores] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [storeId, setStoreId] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [reelNo, setReelNo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [stRes, pRes] = await Promise.all([
          fetch('/api/stores?status=Active'),
          fetch('/api/products?limit=1000'),
        ]);
        const [stData, pData] = await Promise.all([stRes.json(), pRes.json()]);
        if (stRes.ok) setStores((stData.stores || []).map((s: any) => ({ _id: s._id, label: s.store })));
        if (pRes.ok) setProducts((pData.products || []).map((p: any) => ({ _id: p._id, label: p.item })));
      } catch {}
    })();
  }, []);

  const reset = () => {
    setStoreId(''); setProductId(''); setQty(''); setWeight(''); setReelNo(''); setNotes(''); setErrorMsg(null); setSuccessMsg(null);
  };

  const save = async () => {
    try {
      setSaving(true); setErrorMsg(null); setSuccessMsg(null);
      if (!storeId || !productId) { setErrorMsg('Select store and product'); return; }
      const payload: any = {
        storeId,
        productId,
        quantityPkts: -Math.abs(Number(qty || 0)),
        weightKg: -Math.abs(Number(weight || 0)),
        reelNo: reelNo || undefined,
        notes: notes || undefined,
      };
      const res = await fetch('/api/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json(); setErrorMsg(err.error || 'Failed to reduce stock'); return; }
      setSuccessMsg('Stock reduced successfully');
      reset();
    } catch (e) {
      setErrorMsg('Unexpected error while reducing stock');
    } finally { setSaving(false); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Store Out</h1>
            <p className="text-gray-600">Reduce stock directly from a store</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {errorMsg && <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{errorMsg}</div>}
          {successMsg && <div className="mb-4 rounded bg-green-50 border border-green-200 p-3 text-sm text-green-700">{successMsg}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
              <select value={storeId} onChange={(e)=>setStoreId(e.target.value)} className="w-full px-3 py-2 border rounded">
                <option value="">Select store</option>
                {stores.map(s => <option key={s._id} value={s._id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select value={productId} onChange={(e)=>setProductId(e.target.value)} className="w-full px-3 py-2 border rounded">
                <option value="">Select product</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reel # (optional)</label>
              <input value={reelNo} onChange={(e)=>setReelNo(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Reel #" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty (Pkts)</label>
              <input type="number" value={qty} onChange={(e)=>setQty(e.target.value === '' ? '' : Number(e.target.value) || 0)} className="w-full px-3 py-2 border rounded text-right" min={0} step={1} placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (Kg)</label>
              <input type="number" value={weight} onChange={(e)=>setWeight(e.target.value === '' ? '' : Number(e.target.value) || 0)} className="w-full px-3 py-2 border rounded text-right" min={0} step="0.01" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={save} disabled={saving || !storeId || !productId} className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Reduce Stock'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
