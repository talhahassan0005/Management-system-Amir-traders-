'use client';

// @ts-ignore - Suppress transient React type resolution in editor; deps are installed
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout/Layout';
import { Loader2, Plus, Save, Trash2, Package, ArrowRight } from 'lucide-react';

interface Product { _id: string; item: string; description: string; length?: number; width?: number; grams?: number; type?: 'Reel' | 'Board' | string }
interface Store { _id: string; store: string; description: string; status: string }
interface Stock { _id: string; productId: string; storeId: string; quantityPkts: number; weightKg: number; reelNo?: string; notes?: string }

interface MaterialOutItem { 
  productId: string; 
  storeId: string; 
  quantityPkts: number; 
  weightKg: number; 
  reelNo?: string; 
  notes?: string; 
  description?: string; width?: number; grams?: number; length?: number; packing?: number; brand?: string; constant?: boolean;
}

interface ProductionItem { 
  productId: string; 
  reelNo?: string; 
  quantityPkts: number; 
  weightKg: number; 
  notes?: string; 
  description?: string; width?: number; grams?: number; length?: number; packing?: number; brand?: string; constant?: boolean; rateOn?: 'Weight' | 'Quantity'; rate?: number; value?: number;
}

interface Production { 
  _id?: string; 
  productionNumber?: string; 
  date: string; 
  remarks?: string; 
  reference?: string;
  materialOut: MaterialOutItem[];
  items: ProductionItem[];
  outputStoreId: string;
}

export default function ProductionPage() {
  const [rows, setRows] = useState<Production[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selected, setSelected] = useState<Production | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  // Filters for Recent Productions (same behavior as Recent Purchases)
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0,10));

  const [form, setForm] = useState<Production>({ 
    date: new Date().toISOString().slice(0,10), 
    remarks: '', 
    reference: '',
    materialOut: [],
    items: [],
    outputStoreId: ''
  });

  const loadData = async () => {
    try {
      const [productsRes, storesRes, stocksRes] = await Promise.all([
        fetch('/api/products?limit=1000'),
        fetch('/api/stores?status=Active'),
        fetch('/api/stock?limit=1000')
      ]);

      const [productsData, storesData, stocksData] = await Promise.all([
        productsRes.json(),
        storesRes.json(),
        stocksRes.json()
      ]);

      setProducts(productsData.products || []);
      setStores(storesData.stores || []);
      setStocks(stocksData.stocks || []);
    } catch (e) { 
      console.error('Failed to load data', e); 
    }
  };

  const fetchStockFor = async (productId?: string, storeId?: string) => {
    try {
      if (!productId || !storeId) return;
      const params = new URLSearchParams({ productId, storeId });
      const res = await fetch(`/api/stock?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) return;
      const rows: any[] = data.stocks || [];
      // Merge/Upsert the fetched stock into local state so getAvailableStock reflects latest value
      setStocks((prev: Stock[]) => {
        const next = [...prev];
        const found = rows[0];
        const idx = next.findIndex((s: any) => s.productId === productId && s.storeId === storeId);
        if (found) {
          if (idx >= 0) next[idx] = { ...next[idx], ...found } as any; else next.push(found as any);
        } else {
          // Ensure we at least have a zero entry to show 0
          const empty: any = { productId, storeId, quantityPkts: 0, weightKg: 0 };
          if (idx >= 0) next[idx] = { ...next[idx], ...empty }; else next.push(empty);
        }
        return next;
      });
    } catch {}
  };

  const fetchRows = async () => {
    try {
      setLoading(true);
      let url = '/api/production?limit=100';
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const q = params.toString();
      if (q) url += `&${q}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setRows(data.productions || []);
      else console.error('Failed to load productions:', data.error);
    } catch (e) { console.error('Error fetching productions:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  // Auto-load recent productions on initial mount with current date filters (To defaults to today)
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setSelected(null);
    setForm({ 
      date: new Date().toISOString().slice(0,10), 
      remarks: '', 
      reference: '',
      materialOut: [],
      items: [],
      outputStoreId: ''
    });
    setErrorMsg(null); 
    setSuccessMsg(null);
  };

  const addMaterialOut = () => {
    setForm((p: Production) => ({ 
      ...p, 
      materialOut: [...(p.materialOut||[]), { 
        productId: '', 
        storeId: '', 
        quantityPkts: 0, 
        weightKg: 0, 
        reelNo: '', 
        notes: '',
        packing: 100
      }] 
    }));
  };

  const addProductionItem = () => {
    setForm((p: Production) => ({ 
      ...p, 
      items: [...(p.items||[]), { 
        productId: '', 
        quantityPkts: 0, 
        weightKg: 0, 
        reelNo: '', 
        notes: '',
        packing: 100
      }] 
    }));
  };

  const removeMaterialOut = (idx: number) => {
    setForm((p: Production) => ({ 
      ...p, 
      materialOut: p.materialOut.filter((_: MaterialOutItem, i: number) => i !== idx) 
    }));
  };

  const removeProductionItem = (idx: number) => {
    setForm((p: Production) => ({ 
      ...p, 
      items: p.items.filter((_: ProductionItem, i: number) => i !== idx) 
    }));
  };

  const save = async () => {
    try {
      setSaving(true); 
      setErrorMsg(null); 
      setSuccessMsg(null);
      
      if (!form.date) { setErrorMsg('Date is required'); return; }
      if (!form.outputStoreId) { setErrorMsg('Output store is required'); return; }
      if (!form.materialOut || form.materialOut.length === 0) { setErrorMsg('Add at least one material out item'); return; }
      if (!form.items || form.items.length === 0) { setErrorMsg('Add at least one production item'); return; }
  if (form.materialOut.some((it: MaterialOutItem) => !it.productId || !it.storeId)) { setErrorMsg('Select product and store for all material out items'); return; }
  if (form.items.some((it: ProductionItem) => !it.productId)) { setErrorMsg('Select product for all production items'); return; }

      const payload = { ...form, date: new Date(form.date).toISOString() };
      const url = selected?._id ? `/api/production/${selected._id}` : '/api/production';
      const method = selected?._id ? 'PUT' : 'POST';
      
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Failed to save'); return; }
      
  await fetchRows(); 
      await loadData(); // Reload stocks after production
      resetForm(); 
      setSuccessMsg('Production saved successfully');
    } catch (e) { 
      console.error('Error saving production:', e); 
      setErrorMsg('Unexpected error while saving'); 
    }
    finally { setSaving(false); }
  };

  const computeUnitWeight = (p?: Product | null): number => {
    if (!p) return 0;
    const length = Number(p.length || 0);
    const width = Number(p.width || 0);
    const grams = Number(p.grams || 0);
    if (length <= 0 || width <= 0 || grams <= 0) return 0;
    if ((p.type || '').toLowerCase() === 'board') {
      return (length * width * grams) / 15500;
    }
    return length * width * grams;
  };

  const getAvailableStock = (productId: string, storeId: string): number => {
    const getId = (v: any) => typeof v === 'string' ? v : (v?._id || v?.id || '');
    const stock = (stocks as any[]).find((s: any) => getId(s.productId) === productId && getId(s.storeId) === storeId);
    return stock?.quantityPkts || 0;
  };

  const onChangeMaterialProduct = (idx: number, productId: string) => {
    let storeAfter = '';
    setForm((p: Production) => {
      const materialOut = [...p.materialOut];
      const next = { ...materialOut[idx], productId } as any;
      const product = products.find((pr: Product) => pr._id === productId);
      const unit = computeUnitWeight(product);
      const pkt = Number(next.quantityPkts || 0);
      next.weightKg = +(pkt * unit).toFixed(4);
      // autofill product meta
      next.description = product?.description || '';
      next.width = product?.width || 0;
      next.grams = product?.grams || 0;
      next.length = product?.length || 0;
      next.packing = 100;
      next.brand = (product as any)?.brand || '';
      storeAfter = next.storeId || '';
      materialOut[idx] = next;
      return { ...p, materialOut };
    });
    // Trigger live stock fetch for the selected product-store
    if (storeAfter && productId) fetchStockFor(productId, storeAfter);
  };

  const onChangeMaterialPkts = (idx: number, pktVal: number) => {
    setForm((p: Production) => {
      const materialOut = [...p.materialOut];
      const next = { ...materialOut[idx], quantityPkts: pktVal } as any;
      // Set weight equal to quantity
      next.weightKg = pktVal || 0;
      materialOut[idx] = next;
      return { ...p, materialOut };
    });
  };

  const onChangeProductionProduct = (idx: number, productId: string) => {
    setForm((p: Production) => {
      const items = [...p.items];
      const next = { ...items[idx], productId } as any;
      const product = products.find((pr: Product) => pr._id === productId);
      const unit = computeUnitWeight(product);
      const pkt = Number(next.quantityPkts || 0);
      next.weightKg = +(pkt * unit).toFixed(4);
      // autofill product meta
      next.description = product?.description || '';
      next.width = product?.width || 0;
      next.grams = product?.grams || 0;
      next.length = product?.length || 0;
      next.packing = 0;
      next.brand = '';
      next.rateOn = 'Weight';
      next.rate = 0;
      next.value = 0;
      items[idx] = next;
      return { ...p, items };
    });
  };

  const onChangeProductionPkts = (idx: number, pktVal: number) => {
    setForm((p: Production) => {
      const items = [...p.items];
      const next = { ...items[idx], quantityPkts: pktVal } as any;
      const product = products.find((pr: Product) => pr._id === next.productId);
      const unit = computeUnitWeight(product);
      next.weightKg = +(Number(pktVal || 0) * unit).toFixed(4);
      items[idx] = next;
      return { ...p, items };
    });
  };

  const edit = (row: Production) => {
    setSelected(row);
    setForm({ 
      date: row.date?.toString()?.slice(0,10) || new Date().toISOString().slice(0,10), 
      remarks: row.remarks || '', 
      reference: row.reference || '',
      materialOut: (row.materialOut||[]).map(it => ({ ...it })),
      items: (row.items||[]).map(it => ({ ...it })),
      outputStoreId: row.outputStoreId || '',
      _id: row._id, 
      productionNumber: row.productionNumber 
    });
  };

  const onChangeOutputStore = (storeId: string) => {
    setForm((p: Production) => ({
      ...p,
      outputStoreId: storeId,
      items: p.items.map((item: ProductionItem) => ({ ...item, productId: '' })) // Clear productIds when output store changes
    }));
  };

  const onChangeMaterialStore = (idx: number, storeId: string) => {
    let productAfter = '';
    setForm((p: Production) => {
      const materialOut = [...p.materialOut];
      const prev = materialOut[idx];
      const next = { ...prev, storeId, productId: prev.productId || '' } as any;
      productAfter = String(next.productId || '');
      materialOut[idx] = next;
      return { ...p, materialOut };
    });
    if (productAfter && storeId) fetchStockFor(productAfter, storeId);
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/production/${id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); setErrorMsg(err.error || 'Failed to delete'); return; }
      if (selected?._id === id) resetForm();
      await fetchRows();
    } catch (e) { console.error('Error deleting production:', e); setErrorMsg('Unexpected error while deleting'); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production / Reprocess</h1>
            <p className="text-gray-600">Record material out and product in for production</p>
          </div>
          <button onClick={resetForm} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Production</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Main Production Form */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Production / Reprocess</h2>
              
              {errorMsg && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200 mb-4">{errorMsg}</div>}
              {successMsg && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200 mb-4">{successMsg}</div>}
              
              {/* Production Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Production #</label>
                  <input
                    type="text"
                    value={form.productionNumber || ''}
                    onChange={(e) => setForm((p: Production) => ({ ...p, productionNumber: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Auto-generated"
                    readOnly
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p: Production) => ({ ...p, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Referenced</label>
                  <input
                    type="text"
                    value={form.reference || ''}
                    onChange={(e)=>setForm((p: Production)=>({...p, reference: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Reference#"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <input
                    type="text"
                    value={form.remarks}
                    onChange={(e) => setForm((p: Production) => ({ ...p, remarks: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Out Material Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Out Material</h3>
                  </div>
                  <button onClick={addMaterialOut} className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                    <Plus className="w-4 h-4" />
                    <span>Add Material</span>
                  </button>
                </div>

                {(form.materialOut||[]).length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">No materials added</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-base">
                      <thead className="bg-orange-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reel #</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTY</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Width</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grams</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Length</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packing</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Av</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {form.materialOut.map((it: MaterialOutItem, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <select 
                                value={it.storeId} 
                                onChange={(e)=>onChangeMaterialStore(idx, e.target.value)} 
                                className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[10rem]"
                                >
                                <option value="">Select store</option>
                                {stores.map((store: Store) => (
                                  <option key={store._id} value={store._id}>
                                    {store.store}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <select 
                                value={it.productId} 
                                onChange={(e)=>onChangeMaterialProduct(idx, e.target.value)} 
                                disabled={!it.storeId}
                                className={`w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[10rem] ${!it.storeId ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300' : 'bg-white'}`}
                              >
                                <option value="">
                                  {!it.storeId ? 'Select store first' : 'Select product'}
                                </option>
                                {products.map((pr: Product) => (
                                  <option key={pr._id} value={pr._id}>
                                    {pr.item}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={it.reelNo||''} onChange={(e)=>setForm((p: Production)=>{ const materialOut=[...p.materialOut]; materialOut[idx]={...materialOut[idx], reelNo:e.target.value}; return {...p, materialOut};})} className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[8rem]" placeholder="Reel#" />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                value={it.quantityPkts||0} 
                                onChange={(e)=>onChangeMaterialPkts(idx, Number(e.target.value)||0)} 
                                className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                value={it.weightKg||0} 
                                readOnly
                                className="w-full h-10 px-3 py-2 border rounded text-right bg-gray-50 text-gray-900 min-w-[6rem]" 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={it.description||''} onChange={(e)=>setForm((p: Production)=>{ const materialOut=[...p.materialOut]; materialOut[idx]={...materialOut[idx], description:e.target.value}; return {...p, materialOut};})} className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[16rem]" placeholder="Description" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={it.width||0} onChange={(e)=>setForm((p: Production)=>{ const materialOut=[...p.materialOut]; materialOut[idx]={...materialOut[idx], width:Number(e.target.value)||0}; return {...p, materialOut};})} className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={it.grams||0} onChange={(e)=>setForm((p: Production)=>{ const materialOut=[...p.materialOut]; materialOut[idx]={...materialOut[idx], grams:Number(e.target.value)||0}; return {...p, materialOut};})} className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={it.length||0} onChange={(e)=>setForm((p: Production)=>{ const materialOut=[...p.materialOut]; materialOut[idx]={...materialOut[idx], length:Number(e.target.value)||0}; return {...p, materialOut};})} className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={it.packing||0} onChange={(e)=>setForm((p: Production)=>{ const materialOut=[...p.materialOut]; materialOut[idx]={...materialOut[idx], packing:Number(e.target.value)||0}; return {...p, materialOut};})} className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" />
                            </td>
                            <td className="px-4 py-2 text-right text-sm">
                              {it.productId && it.storeId ? getAvailableStock(it.productId, it.storeId) : '-'}
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={it.brand||''} onChange={(e)=>setForm((p: Production)=>{ const materialOut=[...p.materialOut]; materialOut[idx]={...materialOut[idx], brand:e.target.value}; return {...p, materialOut};})} className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[10rem]" placeholder="Brand" />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button onClick={()=>removeMaterialOut(idx)} className="text-red-600 hover:text-red-800 flex items-center gap-1">
                                <Trash2 className="w-4 h-4"/> Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className="flex justify-center mb-6">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>

              {/* In Material Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">In Material</h3>
                  </div>
                  <button onClick={addProductionItem} className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                  </button>
              </div>

              {(form.items||[]).length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">No products added</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-base">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reel #</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTY</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remark</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Length</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packing</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Width</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grams</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate On</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {form.items.map((it: ProductionItem, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                              <select 
                                value={form.outputStoreId} 
                                onChange={(e)=>onChangeOutputStore(e.target.value)}
                                className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[10rem]"
                              >
                                <option value="">Select store</option>
                                {stores.map((store: Store) => (
                                  <option key={store._id} value={store._id}>
                                    {store.store}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <select 
                                value={it.productId} 
                                onChange={(e)=>onChangeProductionProduct(idx, e.target.value)} 
                                disabled={!form.outputStoreId}
                                className={`w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[10rem] ${!form.outputStoreId ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300' : 'bg-white'}`}
                              >
                              <option value="">
                                {!form.outputStoreId ? 'Select store first' : 'Select product'}
                              </option>
                                {products.map((pr: Product) => (
                                  <option key={pr._id} value={pr._id}>
                                    {pr.item}
                                  </option>
                                ))}
                            </select>
                          </td>
                            <td className="px-4 py-2">
                              <input type="text" value={it.reelNo||''} onChange={(e)=>setForm((p: Production)=>{ const items=[...p.items]; items[idx]={...items[idx], reelNo:e.target.value}; return {...p, items};})} className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[8rem]" placeholder="Reel#" />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                value={it.quantityPkts||0} 
                                onChange={(e)=>onChangeProductionPkts(idx, Number(e.target.value)||0)} 
                                className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                value={it.weightKg||0} 
                                onChange={(e)=>setForm((p: Production)=>{ 
                                  const items=[...p.items]; 
                                  items[idx]={...items[idx], weightKg:Number(e.target.value)||0}; 
                                  return {...p, items}; 
                                })} 
                                className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={it.notes||''} onChange={(e)=>setForm((p: Production)=>{ const items=[...p.items]; items[idx]={...items[idx], notes:e.target.value}; return {...p, items};})} className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[12rem]" placeholder="Remark" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={it.brand||''} onChange={(e)=>setForm((p: Production)=>{ const items=[...p.items]; items[idx]={...items[idx], brand:e.target.value}; return {...p, items};})} className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[10rem]" placeholder="Brand" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={it.length||0} onChange={(e)=>setForm((p: Production)=>{ const items=[...p.items]; items[idx]={...items[idx], length:Number(e.target.value)||0}; return {...p, items};})} className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={it.packing||0} onChange={(e)=>setForm((p: Production)=>{ const items=[...p.items]; items[idx]={...items[idx], packing:Number(e.target.value)||0}; return {...p, items};})} className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" />
                            </td>
                          <td className="px-4 py-2">
                              <input type="number" value={it.width||0} onChange={(e)=>setForm((p: Production)=>{ const items=[...p.items]; items[idx]={...items[idx], width:Number(e.target.value)||0}; return {...p, items};})} className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={it.grams||0} onChange={(e)=>setForm((p: Production)=>{ const items=[...p.items]; items[idx]={...items[idx], grams:Number(e.target.value)||0}; return {...p, items};})} className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={it.rate||0} onChange={(e)=>setForm((p: Production)=>{ const items=[...p.items]; items[idx]={...items[idx], rate:Number(e.target.value)||0, value: Number(((it.rateOn||'Weight')==='Quantity' ? (Number(e.target.value)||0) * (it.quantityPkts||0) : (Number(e.target.value)||0) * (it.weightKg||0)).toFixed(2))}; return {...p, items};})} className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]" />
                          </td>
                          <td className="px-4 py-2">
                              <input type="text" value={it.description||''} onChange={(e)=>setForm((p: Production)=>{ const items=[...p.items]; items[idx]={...items[idx], description:e.target.value}; return {...p, items};})} className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[16rem]" placeholder="Description" />
                          </td>
                          <td className="px-4 py-2">
                              <select value={it.rateOn||'Weight'} onChange={(e)=>setForm((p: Production)=>{ const items=[...p.items]; items[idx]={...items[idx], rateOn:(e.target.value as any)}; return {...p, items};})} className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[8rem]">
                                <option value="Weight">Weight</option>
                                <option value="Quantity">Quantity</option>
                              </select>
                          </td>
                          <td className="px-4 py-2 text-right">
                              <button onClick={()=>removeProductionItem(idx)} className="text-red-600 hover:text-red-800 flex items-center gap-1">
                                <Trash2 className="w-4 h-4"/> Remove
                              </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </div>

              {/* Totals Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.items.reduce((sum: number, item: ProductionItem) => sum + (item.value || 0), 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Weight</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.items.reduce((sum: number, item: ProductionItem) => sum + (item.weightKg || 0), 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <button 
                  onClick={save} 
                  disabled={saving} 
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>{saving ? 'Saving...' : selected?._id ? 'Update Production' : 'Save Production'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Productions moved to bottom with filters */}
          <div className="mt-8" id="recent-productions">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Productions</h3>
                <div className="text-gray-400 text-sm">List updates on Apply</div>
              </div>
              <div className="overflow-x-auto">
                <div className="inline-flex items-end gap-3 mb-4 min-w-max">
                <div className="w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchRows}
                    disabled={loading}
                    className="min-w-28 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : 'Apply'}
                  </button>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => { setFromDate(''); setToDate(new Date().toISOString().slice(0,10)); fetchRows(); }}
                    className="min-w-28 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
                  >
                    Clear
                  </button>
                </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materials</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                    ) : rows.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No productions</td></tr>
                    ) : (
                      rows.map((r: Production) => (
                        <tr key={r._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.productionNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.date?.toString()?.slice(0,10)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.materialOut?.length || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.items?.length || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button onClick={()=>edit(r)} className="text-blue-600 hover:text-blue-900">Edit</button>
                              <button onClick={()=> r._id && remove(r._id)} className="text-red-600 hover:text-red-900">Delete</button>
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
        </div>
      </div>
    </Layout>
  );
}
