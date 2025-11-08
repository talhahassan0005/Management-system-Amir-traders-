'use client';

// @ts-ignore - Suppress transient React type resolution in editor; deps are installed
import {
  useEffect,
  useState
} from 'react';
import Layout from '@/components/Layout/Layout';
import ProductTypeahead from '@/components/ProductTypeahead';
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  Package,
  ArrowRight
} from 'lucide-react';
import {
  onStoreUpdated,
  onProductionChanged
} from '@/lib/cross-tab-event-bus';

interface Product {
  _id: string;item: string;description: string;length ? : number;width ? : number;grams ? : number;type ? : 'Reel' | 'Board' | string
}
interface Store {
  _id: string;store: string;description: string;status: string
}
interface Stock {
  _id: string;productId: string;storeId: string;quantityPkts: number;weightKg: number;reelNo ? : string;notes ? : string
}

interface MaterialOutItem {
  productId: string;
  storeId: string;
  quantityPkts: number;
  weightKg: number;
  reelNo ? : string;
  notes ? : string;
  description ? : string;width ? : number;grams ? : number;length ? : number;packing ? : number;brand ? : string;constant ? : boolean;
}

interface ProductionItem {
  productId: string;
  reelNo ? : string;
  quantityPkts: number;
  weightKg: number;
  notes ? : string;
  description ? : string;width ? : number;grams ? : number;length ? : number;packing ? : number;brand ? : string;constant ? : boolean;rateOn ? : 'Weight' | 'Quantity';rate ? : number;value ? : number;
}

interface Production {
  _id ? : string;
  productionNumber ? : string;
  date: string;
  remarks ? : string;
  reference ? : string;
  materialOut: MaterialOutItem[];
  items: ProductionItem[];
  outputStoreId: string;
}

export default function ProductionPage() {
  const [rows, setRows] = useState < Production[] > ([]);
  const [products, setProducts] = useState < Product[] > ([]);
  const [stores, setStores] = useState < Store[] > ([]);
  const [stocks, setStocks] = useState < Stock[] > ([]);
  const [selected, setSelected] = useState < Production | null > (null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState < string | null > (null);
  const [successMsg, setSuccessMsg] = useState < string | null > (null);
  // Filters for Recent Productions (same behavior as Recent Purchases)
  const [fromDate, setFromDate] = useState < string > ('');
  const [toDate, setToDate] = useState < string > (new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState < string > ('');
  const [form, setForm] = useState < Production > ({
    date: new Date().toISOString().slice(0, 10),
    remarks: '',
    reference: '',
    materialOut: [],
    items: [],
    outputStoreId: ''
  });
  // Quick-entry state for the top inputs (prevents auto-adding rows)
  const [quickMaterial, setQuickMaterial] = useState<MaterialOutItem>({
    productId: '',
    storeId: '',
    quantityPkts: 0,
    weightKg: 0,
    reelNo: '',
    notes: '',
    description: '',
    width: 0,
    grams: 0,
    length: 0,
    packing: 100,
    brand: ''
  });
  const [quickProduct, setQuickProduct] = useState<ProductionItem>({
    productId: '',
    reelNo: '',
    quantityPkts: 0,
    weightKg: 0,
    notes: '',
    description: '',
    width: 0,
    grams: 0,
    length: 0,
    packing: 0,
    brand: '',
    rateOn: 'Weight',
    rate: 0,
    value: 0
  });
  // Cache: storeId -> array of productIds available via store-stock aggregation
  const [storeProductMap, setStoreProductMap] = useState<Record<string, string[]>>({});

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

  const loadStores = async () => {
    try {
      const storesRes = await fetch('/api/stores?status=Active');
      const storesData = await storesRes.json();
      if (storesRes.ok) setStores(storesData.stores || []);
    } catch (e) {
      console.error('Error loading stores', e);
    }
  };

  const fetchStockFor = async (productId ? : string, storeId ? : string) => {
    try {
      if (!productId || !storeId) return;
      const params = new URLSearchParams({
        productId,
        storeId
      });
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
          if (idx >= 0) next[idx] = { ...next[idx], ...found } as any;
          else next.push(found as any);
        } else {
          // Ensure we at least have a zero entry to show 0
          const empty: any = {
            productId,
            storeId,
            quantityPkts: 0,
            weightKg: 0
          };
          if (idx >= 0) next[idx] = { ...next[idx], ...empty };
          else next.push(empty);
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
      if (searchQuery) params.set('q', searchQuery);
      const q = params.toString();
      if (q) url += `&${q}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setRows(data.productions || []);
      else console.error('Failed to load productions:', data.error);
    } catch (e) {
      console.error('Error fetching productions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for store updates (cross-tab)
    const unsubscribeStores = onStoreUpdated(() => {
      loadStores();
    });

    const unsubscribeProductions = onProductionChanged(() => {
      fetchRows();
    });


    return () => {
      unsubscribeStores();
      unsubscribeProductions();
    };
  }, []);

  // Auto-load recent productions on initial mount with current date filters (To defaults to today)
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setSelected(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      remarks: '',
      reference: '',
      materialOut: [],
      items: [],
      outputStoreId: ''
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setQuickMaterial({
      productId: '',
      storeId: '',
      quantityPkts: 0,
      weightKg: 0,
      reelNo: '',
      notes: '',
      description: '',
      width: 0,
      grams: 0,
      length: 0,
      packing: 100,
      brand: ''
    });
    setQuickProduct({
      productId: '',
      reelNo: '',
      quantityPkts: 0,
      weightKg: 0,
      notes: '',
      description: '',
      width: 0,
      grams: 0,
      length: 0,
      packing: 0,
      brand: '',
      rateOn: 'Weight',
      rate: 0,
      value: 0
    });
  };

  const addMaterialOut = () => {
    setForm((p: Production) => ({
      ...p,
      materialOut: [...(p.materialOut || []), {
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
      items: [...(p.items || []), {
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

      if (!form.date) {
        setErrorMsg('Date is required');
        return;
      }
      if (!form.outputStoreId) {
        setErrorMsg('Output store is required');
        return;
      }
      if (!form.materialOut || form.materialOut.length === 0) {
        setErrorMsg('Add at least one material out item');
        return;
      }
      if (!form.items || form.items.length === 0) {
        setErrorMsg('Add at least one production item');
        return;
      }
      if (form.materialOut.some((it: MaterialOutItem) => !it.productId || !it.storeId)) {
        setErrorMsg('Select product and store for all material out items');
        return;
      }
      if (form.items.some((it: ProductionItem) => !it.productId)) {
        setErrorMsg('Select product for all production items');
        return;
      }

      const payload = { ...form, date: new Date(form.date).toISOString() };
      const url = selected?._id ? `/api/production/${selected._id}` : '/api/production';
      const method = selected?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save');
        return;
      }

      await fetchRows();
      await loadData(); // Reload stocks after production
      resetForm();
      setSuccessMsg('Production saved successfully');
    } catch (e) {
      console.error('Error saving production:', e);
      setErrorMsg('Unexpected error while saving');
    } finally {
      setSaving(false);
    }
  };

  const computeUnitWeight = (p ? : Product | null): number => {
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

  // Normalize id from string or populated object
  const getId = (v: any): string => (typeof v === 'string' ? v : (v?._id || v?.id || '')) as string;

  const getAvailableStock = (productId: string, storeId: string): number => {
    const stock = (stocks as any[]).find((s: any) => getId(s.productId) === productId && getId(s.storeId) === storeId);
    return stock?.quantityPkts || 0;
  };

  const getProductsForStore = (storeId: string): Product[] => {
    if (!storeId) return [];
    const productIdsInStore = (stocks as any[])
      .filter((stock: any) => getId(stock.storeId) === storeId && Number(stock.quantityPkts || 0) > 0)
      .map((stock: any) => getId(stock.productId));
    const uniqueProductIds = Array.from(new Set(productIdsInStore));
    let result = products.filter(product => uniqueProductIds.includes(getId(product._id)));
    if (result.length === 0) {
      // fallback to aggregated map from /api/store-stock
      const extra = storeProductMap[storeId] || [];
      if (extra.length) result = products.filter(p => extra.includes(getId(p._id)));
    }
    return result;
  };

  // Ensure we have aggregated products for a store using /api/store-stock (by store name)
  const ensureStoreProducts = async (storeId: string) => {
    if (!storeId || storeProductMap[storeId]) return;
    const storeName = (stores.find((s: any) => getId(s._id) === storeId) as any)?.store || '';
    if (!storeName) return;
    try {
      const res = await fetch(`/api/store-stock?store=${encodeURIComponent(storeName)}&limit=2000`);
      const data = await res.json();
      if (!res.ok) return;
      const itemCodes: string[] = (data?.data || []).filter((r: any) => Number(r.currentQty || 0) > 0).map((r: any) => r.itemCode);
      if (!itemCodes.length) {
        setStoreProductMap(prev => ({ ...prev, [storeId]: [] }));
        return;
      }
      const ids = products.filter((p: any) => itemCodes.includes(p.item)).map((p: any) => getId(p._id));
      setStoreProductMap(prev => ({ ...prev, [storeId]: ids }));
    } catch {}
  };

  // Calculate line value based on Rate On
  const calcValue = (it: Partial<ProductionItem>): number => {
    const rate = Number(it.rate || 0);
    const basis = (it.rateOn || 'Weight') === 'Quantity' ? Number(it.quantityPkts || 0) : Number(it.weightKg || 0);
    return +(rate * basis).toFixed(2);
  };

  // For inline grid rows (existing behavior)
  const onChangeMaterialProduct = (idx: number, productId: string) => {
    let storeAfter = '';
    setForm((p: Production) => {
      const materialOut = [...p.materialOut];
      const next = { ...materialOut[idx], productId } as any;
      const product = products.find((pr: Product) => pr._id === productId);
      const unit = computeUnitWeight(product);
      const pkt = Number(next.quantityPkts || 0);
      next.weightKg = +(pkt * unit).toFixed(4);
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
    if (storeAfter && productId) fetchStockFor(productId, storeAfter);
  };

  const onChangeMaterialPkts = (idx: number, pktVal: number) => {
    setForm((p: Production) => {
      const materialOut = [...p.materialOut];
      const next = { ...materialOut[idx], quantityPkts: pktVal } as any;
      // Keep consistent with existing UI: weight mirrors quantity
      next.weightKg = pktVal || 0;
      materialOut[idx] = next;
      return { ...p, materialOut };
    });
  };

  // Quick entry helpers
  const onQuickMaterialStore = (storeId: string) => {
    setQuickMaterial((prev) => ({ ...prev, storeId }));
    // Preload list of available products for this store (fallback to store-stock aggregation)
    ensureStoreProducts(storeId);
  };
  const onQuickMaterialProduct = (productId: string) => {
    setQuickMaterial((prev) => {
      const product = products.find((pr: Product) => pr._id === productId);
      return {
        ...prev,
        productId,
        description: product?.description || '',
        width: product?.width || 0,
        grams: product?.grams || 0,
        length: product?.length || 0,
        packing: 100,
        brand: (product as any)?.brand || ''
      } as any;
    });
  };
  const onQuickMaterialPkts = (pktVal: number) => {
    setQuickMaterial((prev) => ({ ...prev, quantityPkts: pktVal, weightKg: pktVal || 0 }));
  };
  const addQuickMaterialToGrid = () => {
    if (!quickMaterial.storeId || !quickMaterial.productId) {
      setErrorMsg('Select store and product first');
      return;
    }
    setForm((p: Production) => ({
      ...p,
      materialOut: [...(p.materialOut || []), { ...quickMaterial }]
    }));
    // fetch latest available for this combination for the grid view
    fetchStockFor(quickMaterial.productId!, quickMaterial.storeId!);
    // reset quick form (retain store for faster entry)
    setQuickMaterial((prev) => ({
      ...prev,
      productId: '',
      quantityPkts: 0,
      weightKg: 0,
      reelNo: '',
      description: '',
      width: 0,
      grams: 0,
      length: 0,
      packing: 100,
      brand: ''
    }));
  };

  const onChangeProductionProduct = (idx: number, productId: string) => {
    setForm((p: Production) => {
      const items = [...p.items];
      const next = { ...items[idx], productId } as any;
      const product = products.find((pr: Product) => pr._id === productId);
      const unit = computeUnitWeight(product);
      const pkt = Number(next.quantityPkts || 0);
      next.weightKg = + (pkt * unit).toFixed(4);
      // autofill product meta
      next.description = product?.description || '';
      next.width = product?.width || 0;
      next.grams = product?.grams || 0;
      next.length = product?.length || 0;
      next.packing = 0;
      next.brand = '';
      next.rateOn = 'Weight';
      next.rate = 0;
      next.value = calcValue(next);
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
      next.weightKg = + (Number(pktVal || 0) * unit).toFixed(4);
      next.value = calcValue(next);
      items[idx] = next;
      return { ...p, items };
    });
  };

  const edit = (row: Production) => {
    setSelected(row);
    setForm({
      date: row.date?.toString()?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      remarks: row.remarks || '',
      reference: row.reference || '',
      materialOut: (row.materialOut || []).map(it => ({ ...it })),
      items: (row.items || []).map(it => ({ ...it })),
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

  // Quick Product helpers
  const onQuickProductSelect = (productId: string) => {
    setQuickProduct((prev) => {
      const product = products.find((pr: Product) => pr._id === productId);
      const unit = computeUnitWeight(product);
      const pkt = Number(prev.quantityPkts || 0);
      return {
        ...prev,
        productId,
        description: product?.description || '',
        width: product?.width || 0,
        grams: product?.grams || 0,
        length: product?.length || 0,
        packing: 0,
        brand: '',
        rateOn: 'Weight',
        rate: 0,
        value: 0,
        weightKg: +(pkt * unit).toFixed(4)
      } as any;
    });
  };
  const onQuickProductPkts = (pktVal: number) => {
    setQuickProduct((prev) => {
      const product = products.find((pr: Product) => pr._id === prev.productId);
      const unit = computeUnitWeight(product);
      const next: any = { ...prev, quantityPkts: pktVal, weightKg: +(Number(pktVal || 0) * unit).toFixed(4) };
      next.value = calcValue(next);
      return next;
    });
  };
  const addQuickProductToGrid = () => {
    if (!form.outputStoreId) {
      setErrorMsg('Select output store first');
      return;
    }
    if (!quickProduct.productId) {
      setErrorMsg('Select product for product entry');
      return;
    }
    const next = { ...quickProduct, value: calcValue(quickProduct) } as ProductionItem;
    setForm((p: Production) => ({ ...p, items: [...(p.items || []), next] }));
    setQuickProduct({
      productId: '',
      reelNo: '',
      quantityPkts: 0,
      weightKg: 0,
      notes: '',
      description: '',
      width: 0,
      grams: 0,
      length: 0,
      packing: 0,
      brand: '',
      rateOn: 'Weight',
      rate: 0,
      value: 0
    });
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
    // Also ensure we have the aggregated product list for this store to populate dropdown
    ensureStoreProducts(storeId);
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/production/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to delete');
        return;
      }
      if (selected?._id === id) resetForm();
      await fetchRows();
    } catch (e) {
      console.error('Error deleting production:', e);
      setErrorMsg('Unexpected error while deleting');
    }
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
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Main Production Form */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Production / Reprocess</h2>

              {errorMsg && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200 mb-4">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200 mb-4">
                  {successMsg}
                </div>
              )}

              {/* Production Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mb-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Production #</label>
                  <input
                    type="text"
                    value={form.productionNumber || ''}
                    onChange={(e) => setForm((p: Production) => ({ ...p, productionNumber: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    placeholder="Auto-generated"
                    readOnly
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p: Production) => ({ ...p, date: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Referenced</label>
                  <input
                    type="text"
                    value={form.reference || ''}
                    onChange={(e) => setForm((p: Production) => ({ ...p, reference: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    placeholder="Reference#"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Remarks</label>
                  <input
                    type="text"
                    value={form.remarks}
                    onChange={(e) => setForm((p: Production) => ({ ...p, remarks: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    placeholder="Optional"
                  />
                </div>

                {/* Material Entry Section */}
                <div className="mb-3 md:col-span-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Material Entry</h3>
                    </div>
                  </div>

                  {/* Material Entry Quick Inputs (no auto-add) */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-1 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Store</label>
                      <select
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                        value={quickMaterial.storeId}
                        onChange={(e) => onQuickMaterialStore(e.target.value)}
                      >
                        <option value="">Select Store</option>
                        {stores.map((store: Store) => (
                          <option key={store._id} value={store._id}>
                            {store.store}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Product</label>
                      <ProductTypeahead
                        value={quickMaterial.productId || ''}
                        disabled={!quickMaterial.storeId}
                        options={getProductsForStore(quickMaterial.storeId).map((p: any) => ({ _id: p._id, item: p.item, description: p.description, brand: (p as any).brand }))}
                        placeholder={!quickMaterial.storeId ? 'Select store first' : 'Type to search product'}
                        onSelect={(p) => onQuickMaterialProduct(p._id)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Reel#</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                        placeholder="Reel#"
                        value={quickMaterial.reelNo || ''}
                        onChange={(e) => setQuickMaterial((prev) => ({ ...prev, reelNo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Qty</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                        value={quickMaterial.quantityPkts || 0}
                        onChange={(e) => onQuickMaterialPkts(Number(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Weight</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50 text-gray-900 text-sm"
                        readOnly
                        value={quickMaterial.weightKg || 0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Length</label>
                      <input type="number" value={quickMaterial.length || 0} onChange={(e)=> setQuickMaterial((prev)=> ({...prev, length: Number(e.target.value) || 0}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Width</label>
                      <input type="number" value={quickMaterial.width || 0} onChange={(e)=> setQuickMaterial((prev)=> ({...prev, width: Number(e.target.value) || 0}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Grams</label>
                      <input type="number" value={quickMaterial.grams || 0} onChange={(e)=> setQuickMaterial((prev)=> ({...prev, grams: Number(e.target.value) || 0}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Packing</label>
                      <input type="number" value={quickMaterial.packing || 0} onChange={(e)=> setQuickMaterial((prev)=> ({...prev, packing: Number(e.target.value) || 0}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Brand</label>
                      <input type="text" value={quickMaterial.brand || ''} onChange={(e)=> setQuickMaterial((prev)=> ({...prev, brand: e.target.value}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Description</label>
                      <input type="text" value={quickMaterial.description || ''} onChange={(e)=> setQuickMaterial((prev)=> ({...prev, description: e.target.value}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                    </div>
                  </div>

                  <div className="flex space-x-1 mt-2">
                    <button
                      onClick={addQuickMaterialToGrid}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Grid</span>
                    </button>
                  </div>

                  {/* Material Items Display */}
                  <div className="mt-3">
                    {(form.materialOut || []).length === 0 ? (
                      <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">No materials added</div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-orange-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reel #</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTY</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Width</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Length</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packing</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Width</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grams</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate On</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grams</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Length</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packing</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {form.materialOut.map((it: MaterialOutItem, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2">
                                  <select
                                    value={it.storeId}
                                    onChange={(e) => onChangeMaterialStore(idx, e.target.value)}
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
                                <td className="px-4 py-2 min-w-[12rem]">
                                  <ProductTypeahead
                                    value={it.productId || ''}
                                    disabled={!it.storeId}
                                    options={getProductsForStore(it.storeId).map((p: any) => ({ _id: p._id, item: p.item, description: p.description, brand: (p as any).brand }))}
                                    placeholder={!it.storeId ? 'Select store first' : 'Type to search product'}
                                    onSelect={(p) => onChangeMaterialProduct(idx, p._id)}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={it.reelNo || ''}
                                    onChange={(e) =>
                                      setForm((p: Production) => {
                                        const materialOut = [...p.materialOut];
                                        materialOut[idx] = { ...materialOut[idx], reelNo: e.target.value } as any;
                                        return { ...p, materialOut };
                                      })
                                    }
                                    className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[8rem]"
                                    placeholder="Reel#"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={it.quantityPkts || 0}
                                    onChange={(e) => onChangeMaterialPkts(idx, Number(e.target.value) || 0)}
                                    className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={it.weightKg || 0}
                                    readOnly
                                    className="w-full h-10 px-3 py-2 border rounded text-right bg-gray-50 text-gray-900 min-w-[6rem]"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={it.description || ''}
                                    onChange={(e) =>
                                      setForm((p: Production) => {
                                        const materialOut = [...p.materialOut];
                                        materialOut[idx] = { ...materialOut[idx], description: e.target.value } as any;
                                        return { ...p, materialOut };
                                      })
                                    }
                                    className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[16rem]"
                                    placeholder="Description"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={it.width || 0}
                                    onChange={(e) =>
                                      setForm((p: Production) => {
                                        const materialOut = [...p.materialOut];
                                        materialOut[idx] = { ...materialOut[idx], width: Number(e.target.value) || 0 } as any;
                                        return { ...p, materialOut };
                                      })
                                    }
                                    className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={it.grams || 0}
                                    onChange={(e) =>
                                      setForm((p: Production) => {
                                        const materialOut = [...p.materialOut];
                                        materialOut[idx] = { ...materialOut[idx], grams: Number(e.target.value) || 0 } as any;
                                        return { ...p, materialOut };
                                      })
                                    }
                                    className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={it.length || 0}
                                    onChange={(e) =>
                                      setForm((p: Production) => {
                                        const materialOut = [...p.materialOut];
                                        materialOut[idx] = { ...materialOut[idx], length: Number(e.target.value) || 0 } as any;
                                        return { ...p, materialOut };
                                      })
                                    }
                                    className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={it.packing || 0}
                                    onChange={(e) =>
                                      setForm((p: Production) => {
                                        const materialOut = [...p.materialOut];
                                        materialOut[idx] = { ...materialOut[idx], packing: Number(e.target.value) || 0 } as any;
                                        return { ...p, materialOut };
                                      })
                                    }
                                    className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                  />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {it.productId && it.storeId ? getAvailableStock(it.productId, it.storeId) : '-'}
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={it.brand || ''}
                                    onChange={(e) =>
                                      setForm((p: Production) => {
                                        const materialOut = [...p.materialOut];
                                        materialOut[idx] = { ...materialOut[idx], brand: e.target.value } as any;
                                        return { ...p, materialOut };
                                      })
                                    }
                                    className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[10rem]"
                                    placeholder="Brand"
                                  />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    onClick={() => removeMaterialOut(idx)}
                                    className="text-red-600 hover:text-red-800 flex items-center gap-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Remove
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

                  {/* Product Entry Section */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-green-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Product Entry</h3>
                      </div>
                    </div>

                    {/* Product Entry Quick Inputs (no auto-add) */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-1 mb-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Store</label>
                        <select
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                          value={form.outputStoreId}
                          onChange={(e) => onChangeOutputStore(e.target.value)}
                        >
                          <option value="">Select Store</option>
                          {stores.map((store: Store) => (
                            <option key={store._id} value={store._id}>
                              {store.store}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Product</label>
                        <ProductTypeahead
                          value={quickProduct.productId || ''}
                          disabled={!form.outputStoreId}
                          options={products.map((p: any) => ({ _id: p._id, item: p.item, description: p.description, brand: (p as any).brand }))}
                          placeholder={!form.outputStoreId ? 'Select store first' : 'Type to search product'}
                          onSelect={(p) => onQuickProductSelect(p._id)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Reel#</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                          placeholder="Reel#"
                          value={quickProduct.reelNo || ''}
                          onChange={(e) => setQuickProduct((prev)=> ({...prev, reelNo: e.target.value}))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Qty</label>
                        <input type="number" value={quickProduct.quantityPkts || 0} onChange={(e)=> onQuickProductPkts(Number(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Weight</label>
                        <input type="number" value={quickProduct.weightKg || 0} readOnly className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Rate</label>
                        <input type="number" value={quickProduct.rate || 0} onChange={(e)=> setQuickProduct((prev)=> ({...prev, rate: Number(e.target.value) || 0}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Brand</label>
                        <input type="text" value={quickProduct.brand || ''} onChange={(e)=> setQuickProduct((prev)=> ({...prev, brand: e.target.value}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Length</label>
                        <input type="number" value={quickProduct.length || 0} onChange={(e)=> setQuickProduct((prev)=> ({...prev, length: Number(e.target.value) || 0}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Width</label>
                        <input type="number" value={quickProduct.width || 0} onChange={(e)=> setQuickProduct((prev)=> ({...prev, width: Number(e.target.value) || 0}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Grams</label>
                        <input type="number" value={quickProduct.grams || 0} onChange={(e)=> setQuickProduct((prev)=> ({...prev, grams: Number(e.target.value) || 0}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Packing</label>
                        <input type="number" value={quickProduct.packing || 0} onChange={(e)=> setQuickProduct((prev)=> ({...prev, packing: Number(e.target.value) || 0}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Description</label>
                        <input type="text" value={quickProduct.description || ''} onChange={(e)=> setQuickProduct((prev)=> ({...prev, description: e.target.value}))} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
                      </div>
                    </div>

                    <div className="flex space-x-1 mt-2">
                      <button
                        onClick={addQuickProductToGrid}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Grid</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* In Material Section */}
                <div className="md:col-span-3">
                  {(form.items || []).length === 0 ? (
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
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate On</th>
                            <th className="px-4 py-2" />
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {form.items.map((it: ProductionItem, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <select
                                  value={form.outputStoreId}
                                  onChange={(e) => onChangeOutputStore(e.target.value)}
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
                              <td className="px-4 py-2 min-w-[12rem]">
                                <ProductTypeahead
                                  value={it.productId || ''}
                                  disabled={!form.outputStoreId}
                                  options={products.map((p: any) => ({ _id: p._id, item: p.item, description: p.description, brand: (p as any).brand }))}
                                  placeholder={!form.outputStoreId ? 'Select store first' : 'Type to search product'}
                                  onSelect={(p) => onChangeProductionProduct(idx, p._id)}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={it.reelNo || ''}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      items[idx] = { ...items[idx], reelNo: e.target.value } as any;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[8rem]"
                                  placeholder="Reel#"
                                />
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={it.quantityPkts || 0}
                                  onChange={(e) => onChangeProductionPkts(idx, Number(e.target.value) || 0)}
                                  className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                />
                              </td>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={it.weightKg || 0}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      items[idx] = { ...items[idx], weightKg: Number(e.target.value) || 0 } as any;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={it.notes || ''}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      items[idx] = { ...items[idx], notes: e.target.value } as any;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[12rem]"
                                  placeholder="Remark"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={it.brand || ''}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      items[idx] = { ...items[idx], brand: e.target.value } as any;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[10rem]"
                                  placeholder="Brand"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={it.length || 0}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      items[idx] = { ...items[idx], length: Number(e.target.value) || 0 } as any;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={it.packing || 0}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      items[idx] = { ...items[idx], packing: Number(e.target.value) || 0 } as any;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={it.width || 0}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      items[idx] = { ...items[idx], width: Number(e.target.value) || 0 } as any;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={it.grams || 0}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      items[idx] = { ...items[idx], grams: Number(e.target.value) || 0 } as any;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={it.rate || 0}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      const next = { ...items[idx], rate: Number(e.target.value) || 0 } as any;
                                      next.value = calcValue(next);
                                      items[idx] = next;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-right text-gray-900 min-w-[6rem]"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={it.value || 0}
                                  readOnly
                                  className="w-full h-10 px-3 py-2 border rounded text-right bg-gray-50 text-gray-900 min-w-[6rem]"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={it.description || ''}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      items[idx] = { ...items[idx], description: e.target.value } as any;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[12rem]"
                                  placeholder="Description"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  value={it.rateOn || 'Weight'}
                                  onChange={(e) =>
                                    setForm((p: Production) => {
                                      const items = [...p.items];
                                      const next = { ...items[idx], rateOn: e.target.value as any } as any;
                                      next.value = calcValue(next);
                                      items[idx] = next;
                                      return { ...p, items };
                                    })
                                  }
                                  className="w-full h-10 px-3 py-2 border rounded text-gray-900 min-w-[8rem]"
                                >
                                  <option value="Weight">Weight</option>
                                  <option value="Quantity">Quantity</option>
                                </select>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  onClick={() => removeProductionItem(idx)}
                                  className="text-red-600 hover:text-red-800 flex items-center gap-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals were visible here; removed as requested to avoid confusion. */}

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
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Search by number or remarks"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={fetchRows}
                    disabled={loading}
                    className="min-w-28 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
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
                      onClick={() => {
                        setFromDate('');
                        setToDate(new Date().toISOString().slice(0, 10));
                        setSearchQuery('');
                        fetchRows();
                      }}
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
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No productions
                        </td>
                      </tr>
                    ) : (
                      rows.map((r: Production) => (
                        <tr key={r._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.productionNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.date?.toString()?.slice(0, 10)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.materialOut?.length || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.items?.length || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button onClick={() => edit(r)} className="text-blue-600 hover:text-blue-900">Edit</button>
                              <button onClick={() => r._id && remove(r._id)} className="text-red-600 hover:text-red-900">Delete</button>
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
