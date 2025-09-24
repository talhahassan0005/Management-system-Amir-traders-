'use client';

import { useEffect, useState, Fragment } from 'react';
import Layout from '@/components/Layout/Layout';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';

interface StoreOpt { _id: string; store: string }
interface ProductExt {
  _id: string;
  item: string;
  description?: string;
  brand?: string;
  width?: number;
  length?: number;
  grams?: number;
  type?: string; // Reel/Board
}

interface ItemRow {
  store: string;
  product: string;
  description?: string;
  brand?: string;
  width?: number;
  length?: number;
  grams?: number;
  qty: number;
  stock?: number; // preview
  baseStock?: number; // fetched
  weight: number;
  packing?: number;
  remarks?: string;
  reelNo?: string;
}

export default function StoreInPage() {
  const [stores, setStores] = useState<StoreOpt[]>([]);
  const [products, setProducts] = useState<ProductExt[]>([]);
  const [items, setItems] = useState<ItemRow[]>([{ store: '', product: '', qty: 0, weight: 0 }]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [globalStore, setGlobalStore] = useState('');
  const [storeLocked, setStoreLocked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [stRes, pRes] = await Promise.all([
          fetch('/api/stores?status=Active'),
          fetch('/api/products?limit=1000'),
        ]);
        const [stData, pData] = await Promise.all([stRes.json(), pRes.json()]);
        if (stRes.ok) setStores((stData.stores || []).map((s: any) => ({ _id: s._id, store: s.store })));
        if (pRes.ok) setProducts((pData.products || []));
      } catch {}
    })();
  }, []);

  const addItem = () => setItems(prev => [...prev, { store: globalStore || '', product: '', qty: 0, weight: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const productByItem = (code: string) => products.find(p => p.item === code);
  const storeByName = (name: string) => stores.find(s => s.store?.toLowerCase() === name?.toLowerCase());

  const handleChange = (idx: number, field: keyof ItemRow, value: any) => {
    setItems(prev => {
      const next = [...prev];
      const row = { ...next[idx], [field]: value } as ItemRow;
      // Apply store lock
      if (storeLocked && globalStore) row.store = globalStore;

      const prod = productByItem(row.product || '');
      if (field === 'product' && prod) {
        row.description = prod.description || '';
        row.brand = prod.brand || '';
        row.width = Number(prod.width || 0);
        row.length = Number(prod.length || 0);
        row.grams = Number(prod.grams || 0);
      }

      if (['product','qty','weight','width','length','grams'].includes(String(field))) {
        const base = prod || productByItem(row.product || '');
        const lengthEff = Number((row.length ?? base?.length) || 0);
        const widthEff  = Number((row.width  ?? base?.width)  || 0);
        const gramsEff  = Number((row.grams  ?? base?.grams)  || 0);
        const typeEff   = String(base?.type || '').toLowerCase();
        const unit = (lengthEff>0 && widthEff>0 && gramsEff>0) ? (typeEff === 'board' ? (lengthEff*widthEff*gramsEff)/15500 : (lengthEff*widthEff*gramsEff)) : 0;
        const qty = Number(row.qty || 0);
        if (field !== 'weight') {
          const weight = +(qty * unit).toFixed(4);
          if (!Number.isNaN(weight)) row.weight = weight;
        }
      }

      next[idx] = row;
      return next;
    });

    // Stock preview when store or product changes
    if (field === 'store' || field === 'product') {
      const row = items[idx];
      const storeName = (storeLocked ? globalStore : (field==='store' ? String(value) : row.store)).trim();
      const productCode = (field==='product' ? String(value) : row.product).trim();
      if (storeName && productCode) {
        (async () => {
          try {
            let res = await fetch(`/api/store-stock?store=${encodeURIComponent(storeName)}`);
            let data = await res.json();
            let current = 0;
            if (res.ok && Array.isArray(data.data)) {
              const r = data.data.find((d: any) => String(d.itemCode).trim().toUpperCase() === productCode.toUpperCase());
              current = Number(r?.currentQty || 0);
            }
            setItems(prev => {
              const next = [...prev];
              const row2 = { ...(next[idx] || {}) } as ItemRow;
              row2.baseStock = current;
              row2.stock = Number(current) + Number(row2.qty || 0);
              next[idx] = row2;
              return next;
            });
          } catch {}
        })();
      }
    }
  };

  const reset = () => {
    setItems([{ store: '', product: '', qty: 0, weight: 0 }]);
    setErrorMsg(null);
    setSuccessMsg(null);
    setGlobalStore('');
    setStoreLocked(false);
  };

  const saveAll = async () => {
    try {
      setSaving(true); setErrorMsg(null); setSuccessMsg(null);
      // Validate and map to IDs
      const payloads: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const s = storeByName(it.store);
        const p = productByItem(it.product);
        if (!s || !p) {
          setErrorMsg(`Row ${i+1}: invalid ${!s ? 'store' : 'product'}`);
          return;
        }
        const qty = Number(it.qty || 0);
        const weight = Number(it.weight || 0);
        if (qty <= 0 && weight <= 0) {
          setErrorMsg(`Row ${i+1}: enter qty or weight`);
          return;
        }
        payloads.push({
          storeId: s._id,
          productId: p._id,
          quantityPkts: qty,
          weightKg: weight,
          reelNo: it.reelNo || undefined,
          notes: it.remarks || undefined,
        });
      }

      // Post sequentially to maintain order and clearer errors
      for (let i = 0; i < payloads.length; i++) {
        const res = await fetch('/api/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloads[i]) });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setErrorMsg(`Row ${i+1} failed: ${err.error || 'Failed to add stock'}`);
          return;
        }
      }
      setSuccessMsg('Stock added successfully');
      reset();
    } catch {
      setErrorMsg('Unexpected error while adding stock');
    } finally { setSaving(false); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Store In</h1>
            <p className="text-gray-600">Add stock directly to a store</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          {errorMsg && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{errorMsg}</div>}
          {successMsg && <div className="rounded bg-green-50 border border-green-200 p-3 text-sm text-green-700">{successMsg}</div>}

          {/* Global Store Lock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Store (lock for items)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={globalStore}
                  onChange={(e)=>setGlobalStore(e.target.value)}
                  disabled={storeLocked}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Start typing store..."
                  list="global-store-list"
                  autoComplete="off"
                />
                {!storeLocked ? (
                  <button
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                    onClick={() => { if (globalStore) { setStoreLocked(true); setItems(prev => prev.map(r => ({ ...r, store: globalStore })))} }}
                    disabled={!globalStore}
                  >Lock</button>
                ) : (
                  <button className="px-3 py-2 bg-gray-600 text-white rounded-lg" onClick={() => { setStoreLocked(false); setGlobalStore(''); }}>Change</button>
                )}
              </div>
              <datalist id="global-store-list">
                {stores.map(st => <option key={st._id} value={st.store} />)}
              </datalist>
            </div>
          </div>

          {/* Items table compact, two-row layout to avoid horizontal scroll */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Items</h3>
              <button onClick={addItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Plus className="w-4 h-4"/> Add Item
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-x-visible">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Store</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Qty</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Stock</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Weight</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Reel #</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((it, idx) => (
                    <Fragment key={idx}>
                      <tr key={`row1-${idx}`} className="align-top hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={storeLocked ? globalStore : it.store}
                            onChange={(e)=>handleChange(idx,'store', e.target.value)}
                            className="w-full px-2 py-1 border rounded-lg text-sm"
                            placeholder="Store"
                            list={`store-list-${idx}`}
                            disabled={storeLocked}
                            autoComplete="off"
                          />
                          {!storeLocked && (
                            <datalist id={`store-list-${idx}`}>
                              {stores.map(st => <option key={st._id} value={st.store} />)}
                            </datalist>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={it.product}
                            onChange={(e)=>handleChange(idx,'product', e.target.value)}
                            className="w-full px-2 py-1 border rounded-lg text-sm"
                            placeholder="Product"
                            list={`product-list-${idx}`}
                            autoComplete="off"
                          />
                          <datalist id={`product-list-${idx}`}>
                            {products.map(p => <option key={p._id} value={p.item} />)}
                          </datalist>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.qty === 0 ? '' : it.qty} onChange={(e)=>handleChange(idx,'qty', e.target.value===''?0:Number(e.target.value)||0)} className="w-24 px-2 py-1 border rounded-lg text-right text-sm" min={0} step={1} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" readOnly value={it.stock ?? ''} className="w-24 px-2 py-1 border rounded-lg bg-gray-50 text-right text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.weight === 0 ? '' : it.weight} onChange={(e)=>handleChange(idx,'weight', e.target.value===''?0:Number(e.target.value)||0)} className="w-28 px-2 py-1 border rounded-lg text-right text-sm" step="0.1" min={0} />
                        </td>
                        <td className="px-2 py-2">
                          <input value={it.reelNo || ''} onChange={(e)=>handleChange(idx,'reelNo', e.target.value)} className="w-28 px-2 py-1 border rounded-lg text-sm" placeholder="Reel #" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg" title="Remove item">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      <tr key={`row2-${idx}`} className="bg-gray-50/40">
                        <td colSpan={7} className="px-3 pb-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            <div>
                              <label className="block text-[11px] text-gray-600">Description</label>
                              <input value={it.description || ''} onChange={(e)=>handleChange(idx,'description', e.target.value)} className="w-full px-2 py-1 border rounded-lg text-sm" placeholder="Description" />
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-600">Brand</label>
                              <input value={it.brand || ''} onChange={(e)=>handleChange(idx,'brand', e.target.value)} className="w-full px-2 py-1 border rounded-lg text-sm" placeholder="Brand" />
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-600">Width</label>
                              <input type="number" value={it.width ?? ''} onChange={(e)=>handleChange(idx,'width', e.target.value===''?0:Number(e.target.value)||0)} className="w-full px-2 py-1 border rounded-lg text-right text-sm" step="0.01" min={0} />
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-600">Length</label>
                              <input type="number" value={it.length ?? ''} onChange={(e)=>handleChange(idx,'length', e.target.value===''?0:Number(e.target.value)||0)} className="w-full px-2 py-1 border rounded-lg text-right text-sm" step="0.01" min={0} />
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-600">Grams</label>
                              <input type="number" value={it.grams ?? ''} onChange={(e)=>handleChange(idx,'grams', e.target.value===''?0:Number(e.target.value)||0)} className="w-full px-2 py-1 border rounded-lg text-right text-sm" min={0} />
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-600">Packing</label>
                              <input type="number" value={it.packing ?? ''} onChange={(e)=>handleChange(idx,'packing', e.target.value===''?0:Number(e.target.value)||0)} className="w-full px-2 py-1 border rounded-lg text-right text-sm" min={0} />
                            </div>
                            <div className="md:col-span-3 lg:col-span-6">
                              <label className="block text-[11px] text-gray-600">Remarks</label>
                              <input value={it.remarks || ''} onChange={(e)=>handleChange(idx,'remarks', e.target.value)} className="w-full px-2 py-1 border rounded-lg text-sm" placeholder="Remarks" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={saveAll}
              disabled={saving || items.length === 0}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              {saving ? 'Saving...' : 'Add Stock'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
