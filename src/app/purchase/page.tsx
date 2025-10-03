'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
import Layout from '@/components/Layout/Layout';
import { Loader2, Package, Plus, Save, Trash2 } from 'lucide-react';

interface PurchaseItem {
  store: string;
  product: string;
  qty: number;
  weight: number;
  // Live stock preview fields
  stock?: number; // displayed current stock for store+product including this row's qty preview
  baseStock?: number; // fetched current stock before this purchase
  rate?: number;
  rateOn?: 'Weight' | 'Quantity';
  value?: number;
  description?: string;
  brand?: string;
  width?: number;
  length?: number;
  grams?: number;
  packing?: number;
  remarks?: string;
}

interface PurchaseInvoice {
  _id?: string;
  invoiceNumber?: string;
  date: string;
  reference?: string;
  paymentType: 'Cash' | 'Credit';
  supplier?: string;
  items: PurchaseItem[];
  totalAmount: number;
  discount: number;
  freight: number;
  weight: number;
  // UI-only fields for immediate payment
  initialPayment?: number;
  paymentMode?: 'Cash' | 'Bank' | 'Cheque';
}

interface Option { 
  _id: string; 
  label: string; 
  code?: string;
  person?: string;
  description?: string;
}

export default function PurchasePage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<PurchaseInvoice | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Option | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0,10));
  const [searchInvoice, setSearchInvoice] = useState<string>('');

  // Global store selector: lock store once per invoice, then allow items entry
  const [globalStore, setGlobalStore] = useState<string>('');
  const [storeLocked, setStoreLocked] = useState<boolean>(false);

  // Current Item entry (like Sales page Product Entry grid)
  const [currentItem, setCurrentItem] = useState<PurchaseItem>({
    store: '',
    product: '',
    qty: 0,
    weight: 0,
    stock: 0,
    baseStock: 0,
    rate: 0,
    rateOn: 'Weight',
    value: 0,
    description: '',
    brand: '',
    width: 0,
    length: 0,
    grams: 0,
    packing: 100,
    remarks: ''
  });

  const [form, setForm] = useState<PurchaseInvoice>({
    date: new Date().toISOString().slice(0, 10),
    reference: '',
    paymentType: 'Cash',
    supplier: '',
    items: [],
    totalAmount: 0,
    discount: 0,
    freight: 0,
    weight: 0,
    initialPayment: 0,
    paymentMode: 'Cash',
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let url = '/api/purchase-invoices';
      const params = new URLSearchParams();
      
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setInvoices(data.invoices || []);
      } else {
        console.error('Failed to load invoices:', data.error);
      }
    } catch (e) {
      console.error('Error fetching purchase invoices:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load products and suppliers for dropdowns only - don't auto-load invoices
    (async () => {
      try {
        const [pRes, sRes, stRes] = await Promise.all([
          fetch('/api/products?limit=1000'),
          fetch('/api/suppliers?limit=1000'),
          fetch('/api/stores?status=Active'),
        ]);
        const [pData, sData, stData] = await Promise.all([pRes.json(), sRes.json(), stRes.json()]);
        if (pRes.ok) setProducts(pData.products || []);
        if (sRes.ok) setSuppliers((sData.suppliers || []).map((s: any) => ({ 
          _id: s._id, 
          label: s.person ? `${s.person} (${s.description})` : s.description,
          person: s.person,
          description: s.description,
          code: s.code 
        })));
        if (stRes.ok) setStores(stData.stores || []);
      } catch (e) {
        console.error('Error loading products/suppliers:', e);
      }
    })();
  }, []);

  // Auto-load recent purchases on initial mount with current date filters (To defaults to today)
  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep currentItem.store in sync when store is locked/unlocked or changes
  useEffect(() => {
    if (storeLocked && globalStore) {
      setCurrentItem((prev) => ({ ...prev, store: globalStore }));
    }
  }, [storeLocked, globalStore]);

  const computeUnitWeight = (p: any): number => {
    if (!p) return 0;
    const length = Number(p.length || 0);
    const width = Number(p.width || 0);
    const grams = Number(p.grams || 0);
    const type = String(p.type || '').toLowerCase();
    if (length <= 0 || width <= 0 || grams <= 0) return 0;
    if (type === 'board') {
      return (length * width * grams) / 15500;
    }
    return length * width * grams;
  };

  // Handle changes for the Product Entry grid (currentItem)
  const handleCurrentItemChange = (field: keyof PurchaseItem, value: string | number) => {
    setCurrentItem((prev) => {
      const next = { ...prev, [field]: value } as PurchaseItem;
      const selectedProduct = products.find((p: any) => p.item === next.product);
      // If using global locked store, enforce it
      if (storeLocked && globalStore && next.store !== globalStore) {
        next.store = globalStore;
      }
      if (field === 'product' && selectedProduct) {
        next.width = Number(selectedProduct.width || 0);
        next.length = Number(selectedProduct.length || 0);
        next.brand = selectedProduct.brand || '';
        next.grams = Number(selectedProduct.grams || 0);
        next.description = selectedProduct.description || '';
        if (!next.rateOn) next.rateOn = 'Weight';
      }
      // Derived calcs when qty/rate/rateOn/dimensions/weight change
      if (
        field === 'product' ||
        field === 'qty' ||
        field === 'rate' ||
        field === 'rateOn' ||
        field === 'weight' ||
        field === 'width' ||
        field === 'length' ||
        field === 'grams'
      ) {
        const baseProduct = selectedProduct || products.find((p: any) => p.item === next.product);
        const lengthEff = Number((next.length ?? baseProduct?.length) || 0);
        const widthEff = Number((next.width ?? baseProduct?.width) || 0);
        const gramsEff = Number((next.grams ?? baseProduct?.grams) || 0);
        const typeEff = String(baseProduct?.type || '').toLowerCase();
        const unit =
          lengthEff > 0 && widthEff > 0 && gramsEff > 0
            ? typeEff === 'board'
              ? (lengthEff * widthEff * gramsEff) / 15500
              : lengthEff * widthEff * gramsEff
            : 0;
        const qty = Number(next.qty || 0);
        let weight = Number(next.weight || 0);
        if (field !== 'weight') {
          weight = +(qty * unit).toFixed(4);
          if (!Number.isNaN(weight)) next.weight = weight;
        }
        const rate = Number(next.rate || 0);
        const basis = next.rateOn || 'Weight';
        const valueCalc = basis === 'Quantity' ? rate * qty : rate * (next.weight || 0);
        next.value = +(+valueCalc).toFixed(2);
      }
      return next;
    });

    // Fetch stock when store or product change
    if (field === 'store' || field === 'product') {
      const storeRaw = field === 'store' ? String(value) : String(currentItem.store || '');
      const productRaw = field === 'product' ? String(value) : String(currentItem.product || '');
      const store = (storeLocked ? globalStore : storeRaw).trim().toUpperCase();
      const product = productRaw.trim();
      if (store && product) {
        (async () => {
          try {
            let res = await fetch(`/api/store-stock?store=${encodeURIComponent(store)}`);
            let data = await res.json();
            let current = 0;
            if (res.ok && Array.isArray(data.data)) {
              const row = data.data.find(
                (r: any) => String(r.itemCode).trim().toUpperCase() === product.toUpperCase()
              );
              current = Number(row?.currentQty || 0);
            }
            if (!Number.isFinite(current) || current === 0) {
              res = await fetch(`/api/store-stock`);
              data = await res.json();
              if (res.ok && Array.isArray(data.data)) {
                const row = data.data.find(
                  (r: any) =>
                    String(r.store).trim().toUpperCase() === store &&
                    String(r.itemCode).trim().toUpperCase() === product.toUpperCase()
                );
                current = Number(row?.currentQty || 0);
              }
            }
            setCurrentItem((prev) => ({ ...prev, baseStock: current, stock: Number(current) + Number(prev.qty || 0) }));
          } catch {}
        })();
      }
    }
  };

  const addCurrentItemToGrid = () => {
    const item = currentItem;
    if (!item.product) return; // require only product (like Sales)
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          store: storeLocked ? globalStore || item.store : item.store,
          product: item.product,
          qty: Number(item.qty || 0),
          weight: Number(item.weight || 0),
          stock: item.stock,
          baseStock: item.baseStock,
          rate: item.rate,
          rateOn: item.rateOn,
          value: item.value,
          description: item.description,
          brand: item.brand,
          width: item.width,
          length: item.length,
          grams: item.grams,
          packing: item.packing,
          remarks: item.remarks,
        },
      ],
    }));
    // reset entry but keep locked store
    setCurrentItem({
      store: storeLocked ? globalStore : '',
      product: '',
      qty: 0,
      weight: 0,
      stock: 0,
      baseStock: 0,
      rate: 0,
      rateOn: 'Weight',
      value: 0,
      description: '',
      brand: '',
      width: 0,
      length: 0,
      grams: 0,
      packing: 100,
      remarks: ''
    });
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: string | number) => {
    setForm((prev) => {
      const items = [...prev.items];
      const next = { ...items[index], [field]: value } as PurchaseItem;
      // When product changes, capture dimensions for downstream calcs
        const selectedProduct = products.find((p: any) => p.item === next.product);
      // If using global locked store, ensure item.store mirrors it
      if (storeLocked && globalStore && next.store !== globalStore) {
        next.store = globalStore;
      }
      if (field === 'product' && selectedProduct) {
        next.width = Number(selectedProduct.width || 0);
        next.length = Number(selectedProduct.length || 0);
        next.brand = selectedProduct.brand || '';
        next.grams = Number(selectedProduct.grams || 0);
        next.description = selectedProduct.description || '';
        // Default rate basis
        if (!next.rateOn) next.rateOn = 'Weight';
      }
      // Always recompute derived fields when product/qty/rate/rateOn or dimensions change
      if (field === 'product' || field === 'qty' || field === 'rate' || field === 'rateOn' || field === 'weight' || field === 'width' || field === 'length' || field === 'grams') {
        const baseProduct = selectedProduct || products.find((p:any)=>p.item===next.product);
        const lengthEff = Number((next.length ?? baseProduct?.length) || 0);
        const widthEff  = Number((next.width  ?? baseProduct?.width)  || 0);
        const gramsEff  = Number((next.grams  ?? baseProduct?.grams)  || 0);
        const typeEff   = String(baseProduct?.type || '').toLowerCase();
        const unit = (lengthEff>0 && widthEff>0 && gramsEff>0)
          ? (typeEff === 'board' ? (lengthEff * widthEff * gramsEff) / 15500 : (lengthEff * widthEff * gramsEff))
          : 0;
        const qty = Number(next.qty || 0);
        let weight = Number(next.weight || 0);
        if (field !== 'weight') {
          weight = +(qty * unit).toFixed(4);
          if (!Number.isNaN(weight)) next.weight = weight;
        }
        const rate = Number(next.rate || 0);
        const basis = (next.rateOn || 'Weight');
        const valueCalc = basis === 'Quantity' ? rate * qty : rate * (next.weight || 0);
        next.value = +(+valueCalc).toFixed(2);
        // Live stock preview when qty changes
        const base = Number(next.baseStock || 0);
        next.stock = base + (Number.isFinite(qty) ? qty : 0);
      }
      items[index] = next;
      return { ...prev, items };
    });

    // Fetch current stock when store or product changes
    if (field === 'store' || field === 'product') {
      const storeRaw = field === 'store' ? String(value) : String(form.items[index]?.store || '');
      const productRaw = field === 'product' ? String(value) : String(form.items[index]?.product || '');
      const store = (storeLocked ? globalStore : storeRaw).trim().toUpperCase();
      const product = productRaw.trim();
      if (store && product) {
        (async () => {
          try {
            // First try with store filter
            let res = await fetch(`/api/store-stock?store=${encodeURIComponent(store)}`);
            let data = await res.json();
            let current = 0;
            if (res.ok && Array.isArray(data.data)) {
              const row = data.data.find((r: any) => (String(r.itemCode).trim().toUpperCase() === product.toUpperCase()));
              current = Number(row?.currentQty || 0);
            }
            // Fallback without store filter (in case store text doesn't match exactly)
            if (!Number.isFinite(current) || current === 0) {
              res = await fetch(`/api/store-stock`);
              data = await res.json();
              if (res.ok && Array.isArray(data.data)) {
                const row = data.data.find((r: any) => (
                  String(r.store).trim().toUpperCase() === store &&
                  String(r.itemCode).trim().toUpperCase() === product.toUpperCase()
                ));
                current = Number(row?.currentQty || 0);
              }
            }
            setForm((prev) => {
              const items = [...prev.items];
              const it = { ...(items[index] || {}) } as PurchaseItem;
              it.baseStock = current;
              it.stock = Number(current) + Number(it.qty || 0);
              items[index] = it;
              return { ...prev, items };
            });
          } catch (e) {
            // ignore fetch errors, leave stock undefined
          }
        })();
      }
    }
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { store: globalStore || '', product: '', qty: 0, weight: 0, packing: 100 }] }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const totals = useMemo(() => {
    const itemsTotal = form.items.reduce((sum, it) => sum + (Number(it.value) || 0), 0);
    const gross = itemsTotal;
    const net = gross - (form.discount || 0) + (form.freight || 0);
    const weight = form.items.reduce((s, it) => s + (it.weight || 0), 0);
    return { itemsTotal: gross, netAmount: net, weight };
  }, [form.items, form.discount, form.freight]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, totalAmount: totals.netAmount, weight: totals.weight }));
  }, [totals.netAmount, totals.weight]);

  const resetForm = () => {
    setSelected(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      reference: '',
      paymentType: 'Cash',
      supplier: '',
      items: [],
      totalAmount: 0,
      discount: 0,
      freight: 0,
      weight: 0,
      initialPayment: 0,
      paymentMode: 'Cash',
    });
    setSelectedSupplier(null);
    // unlock store for next entry
    setGlobalStore('');
    setStoreLocked(false);
  };

  const saveInvoice = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      // Minimal client-side checks
      if (!form.date) {
        setErrorMsg('Date is required');
        return;
      }
      if (!form.paymentType) { setErrorMsg('Payment type is required'); return; }
      if (!selectedSupplier) { setErrorMsg('Please select a supplier'); return; }
      const validItems = form.items.filter((it) => (it.store || it.product || (it.qty && it.qty > 0) || (it.weight && it.weight > 0)));
      if (validItems.length === 0) {
        setErrorMsg('Please add at least one item with store, product, qty or weight');
        return;
      }
      const payloadItems = validItems.map((it) => ({
        ...it,
        qty: Number(it.qty || 0),
        weight: Number(it.weight || 0),
      }));
      const { initialPayment, paymentMode, ...invoiceFields } = form as any;
      const payload: any = { ...invoiceFields, date: new Date(form.date).toISOString() };
      payload.supplier = selectedSupplier?.label || payload.supplier || '';
      payload.items = payloadItems as any;
      if (selected?._id) {
        const res = await fetch(`/api/purchase-invoices/${selected._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          console.error('Update failed:', err.error);
          setErrorMsg(err.error || 'Failed to update invoice');
          return;
        }
      } else {
        const res = await fetch('/api/purchase-invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          console.error('Create failed:', err.error);
          setErrorMsg(err.error || 'Failed to create invoice');
          return;
        } else {
          // If initial payment > 0, create a payment voucher against supplier
          const created = await res.json();
          const amount = Number(form.initialPayment || 0);
          if (amount > 0 && selectedSupplier?._id) {
            try {
              await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  date: new Date(form.date).toISOString(),
                  partyType: 'Supplier',
                  partyId: selectedSupplier._id,
                  mode: (form.paymentMode || 'Cash') as any,
                  amount,
                  notes: `Advance against ${created?.invoiceNumber || 'purchase'}`,
                }),
              });
            } catch (pe) {
              console.error('Failed to create initial payment:', pe);
            }
          }
        }
      }
      await fetchInvoices();
      resetForm();
      setSuccessMsg('Invoice saved');
    } catch (e) {
      console.error('Error saving invoice:', e);
      setErrorMsg('Unexpected error while saving invoice');
    } finally {
      setSaving(false);
    }
  };

  const editInvoice = (inv: PurchaseInvoice) => {
    setSelected(inv);
    setForm({
      date: inv.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      reference: inv.reference || '',
      paymentType: inv.paymentType,
      supplier: inv.supplier || '',
      items: inv.items?.length ? inv.items : [],
      totalAmount: inv.totalAmount || 0,
      discount: inv.discount || 0,
      freight: inv.freight || 0,
      weight: inv.weight || 0,
      invoiceNumber: inv.invoiceNumber,
      _id: inv._id,
      initialPayment: 0,
      paymentMode: 'Cash',
    });
    setSelectedSupplier(null);
  };

  const deleteInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/purchase-invoices/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        console.error('Delete failed:', err.error);
      }
      await fetchInvoices();
      if (selected?._id === id) resetForm();
    } catch (e) {
      console.error('Error deleting invoice:', e);
    }
  };

  // Filtered view for Recent Purchases by Invoice # (client-side)
  const filteredInvoices = useMemo(() => {
    const q = (searchInvoice || '').trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => String(inv.invoiceNumber || '').toLowerCase().includes(q));
  }, [invoices, searchInvoice]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Invoice</h1>
            <p className="text-gray-600">Manage purchase invoices and supplier transactions</p>
          </div>
        </div>

        

        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              {errorMsg && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
                  {successMsg}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">Date</label>
                  <input 
                    type="date" 
                    value={form.date} 
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} 
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">Store (lock for items)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={globalStore}
                      onChange={(e) => setGlobalStore(e.target.value)}
                      disabled={storeLocked}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Start typing store..."
                      list="global-store-list"
                      autoComplete="off"
                    />
                    {!storeLocked ? (
                      <button
                        onClick={() => {
                          setStoreLocked(true);
                          // Push store to all current rows
                          if (globalStore) {
                            setForm((prev) => ({
                              ...prev,
                              items: prev.items.map((it) => ({ ...it, store: globalStore }))
                            }));
                          }
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                        disabled={!globalStore}
                        title="Lock store for all items"
                      >Lock</button>
                    ) : (
                      <button
                        onClick={() => {
                          setStoreLocked(false);
                          setGlobalStore('');
                        }}
                        className="px-3 py-2 bg-gray-600 text-white rounded-lg"
                        title="Unlock store"
                      >Change</button>
                    )}
                  </div>
                  <datalist id="global-store-list">
                    {stores.map((st: any) => (
                      <option key={st._id || st.store} value={st.store} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">Reference</label>
                  <input 
                    type="text" 
                    value={form.reference} 
                    onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} 
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                    placeholder="Enter reference number"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">Payment Type</label>
                  <select 
                    value={form.paymentType} 
                    onChange={(e) => setForm((p) => ({ ...p, paymentType: e.target.value as any }))} 
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">Supplier</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={selectedSupplier?.label || form.supplier || ''}
                    onChange={(e) => {
                          const val = e.target.value;
                          setForm((p)=>({ ...p, supplier: val }));
                          const match = suppliers.find(s => s.label.toLowerCase() === val.toLowerCase());
                          setSelectedSupplier(match || null);
                        }}
                        list="supplier-list"
                        placeholder="Start typing supplier..."
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        autoComplete="off"
                      />
                      <datalist id="supplier-list">
                    {suppliers.map(s => (
                          <option key={s._id} value={s.label} />
                        ))}
                      </datalist>
                    </div>
                    <input
                      type="text"
                      value={selectedSupplier?.code || ''}
                      readOnly
                      placeholder="Code"
                      className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                      title="Supplier Code"
                    />
                  </div>
                  {selectedSupplier?.person && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-blue-700">Contact Person:</span>
                        <span className="text-sm text-blue-600">{selectedSupplier.person}</span>
                      </div>
                      {selectedSupplier.description && selectedSupplier.person !== selectedSupplier.description && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-blue-700">Company:</span>
                          <span className="text-sm text-blue-600">{selectedSupplier.description}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                {/* Product Entry Grid (same behaviour style as Sales) */}
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Product Entry</h3>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-1">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Store</label>
                      <input
                        type="text"
                        value={storeLocked ? globalStore : currentItem.store}
                        onChange={(e) => handleCurrentItemChange('store', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                        placeholder="Start typing store..."
                        list="entry-store-list"
                        autoComplete="off"
                        disabled={storeLocked}
                      />
                      {!storeLocked && (
                        <datalist id="entry-store-list">
                          {stores.map((st: any) => (
                            <option key={st._id || st.store} value={st.store} />
                          ))}
                        </datalist>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Product</label>
                      <select
                        value={currentItem.product}
                        onChange={(e) => handleCurrentItemChange('product', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      >
                        <option value="">Select Product</option>
                        {products.map((product: any) => (
                          <option key={product.item} value={product.item}>
                            {product.item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Qty</label>
                      <input
                        type="number"
                        value={currentItem.qty === 0 ? '' : currentItem.qty}
                        onChange={(e) => handleCurrentItemChange('qty', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Weight</label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentItem.weight === 0 ? '' : currentItem.weight}
                        onChange={(e) => handleCurrentItemChange('weight', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentItem.rate === 0 ? '' : currentItem.rate}
                        onChange={(e) => handleCurrentItemChange('rate', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Rate On</label>
                      <select
                        value={currentItem.rateOn || 'Weight'}
                        onChange={(e) => handleCurrentItemChange('rateOn', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      >
                        <option value="Weight">Weight</option>
                        <option value="Quantity">Quantity</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentItem.value === 0 ? '' : currentItem.value}
                        readOnly
                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Stock</label>
                      <input
                        type="number"
                        value={currentItem.stock === 0 ? '' : currentItem.stock}
                        readOnly
                        className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Length</label>
                      <input
                        type="number"
                        value={currentItem.length === 0 ? '' : currentItem.length}
                        onChange={(e) => handleCurrentItemChange('length', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Width</label>
                      <input
                        type="number"
                        value={currentItem.width === 0 ? '' : currentItem.width}
                        onChange={(e) => handleCurrentItemChange('width', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Grams</label>
                      <input
                        type="number"
                        value={currentItem.grams === 0 ? '' : currentItem.grams}
                        onChange={(e) => handleCurrentItemChange('grams', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Brand</label>
                      <input
                        type="text"
                        value={currentItem.brand || ''}
                        onChange={(e) => handleCurrentItemChange('brand', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Description</label>
                      <input
                        type="text"
                        value={currentItem.description || ''}
                        onChange={(e) => handleCurrentItemChange('description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Remarks</label>
                      <input
                        type="text"
                        value={currentItem.remarks || ''}
                        onChange={(e) => handleCurrentItemChange('remarks', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-1 mt-2">
                    <button
                      onClick={addCurrentItemToGrid}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Grid</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Invoice Items</h3>
                </div>
                {form.items.length > 0 && (
                <div className="rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {form.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{storeLocked ? globalStore : item.store}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.product}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.qty}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.weight}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.value}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-900"
                            >
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-center mb-3">
                      <div className="bg-blue-100 p-1.5 rounded-full">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-gray-800 mb-3 text-center">Purchase Summary</h4>
                    <div className="space-y-2">
                      <div className="bg-white/80 p-2 rounded border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700 text-xs">Items Total</span>
                          <span className="font-bold text-gray-900 text-sm">PKR {totals.itemsTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="bg-white/80 p-2 rounded border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700 text-xs">Discount</span>
                          <div className="relative">
                            <span className="absolute left-1.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">PKR</span>
                            <input 
                              type="number" 
                              value={form.discount} 
                              onChange={(e) => setForm((p) => ({ ...p, discount: Number(e.target.value) || 0 }))} 
                              className="w-16 pl-4 pr-1 py-1 border border-gray-300 rounded text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium text-xs transition-all duration-200" 
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white/80 p-2 rounded border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700 text-xs">Freight</span>
                          <div className="relative">
                            <span className="absolute left-1.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">PKR</span>
                            <input 
                              type="number" 
                              value={form.freight} 
                              onChange={(e) => setForm((p) => ({ ...p, freight: Number(e.target.value) || 0 }))} 
                              className="w-16 pl-4 pr-1 py-1 border border-gray-300 rounded text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium text-xs transition-all duration-200" 
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-2 rounded border border-blue-300">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-800 font-bold text-sm">Net Amount</span>
                          <span className="text-blue-900 font-black text-base">PKR {totals.netAmount.toFixed(2)}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-blue-600 font-medium">
                          Final amount after adjustments
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="xl:col-span-3 flex items-end justify-end">
                  <button 
                    onClick={saveInvoice} 
                    disabled={saving} 
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center space-x-3 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span className="font-semibold">{saving ? 'Saving...' : selected?._id ? 'Update Invoice' : 'Save Invoice'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Purchases moved to bottom */}
          <div className="mt-8" id="recent-purchases">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Recent Purchases</h3>
                <div className="bg-blue-100 p-1.5 rounded-full">
                  <Package className="w-4 h-4 text-blue-600" />
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
                <div className="w-56">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice #</label>
                  <input
                    type="text"
                    value={searchInvoice}
                    onChange={(e) => setSearchInvoice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by invoice #"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchInvoices}
                    disabled={loading}
                    className="min-w-28 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFromDate('');
                      setToDate(new Date().toISOString().slice(0,10));
                      setSearchInvoice('');
                      fetchInvoices();
                    }}
                    className="min-w-28 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
                  >
                    Clear
                  </button>
                </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Invoice</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Items</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm">Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          <div className="flex flex-col items-center space-y-2">
                            <Package className="w-6 h-6 text-gray-400" />
                            <span className="text-sm">No invoices found</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{inv.invoiceNumber || '-'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{inv.date?.toString()?.slice(0, 10)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{inv.items?.length || 0}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">PKR {inv.totalAmount?.toFixed?.(2) || inv.totalAmount}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center justify-center space-x-1">
                              <button 
                                onClick={() => editInvoice(inv)} 
                                className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-1 rounded transition-colors duration-200"
                                title="Edit invoice"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => {
                                  const printWindow = window.open('', '_blank');
                                  if (printWindow) {
                                    printWindow.document.write(`
                                      <html>
                                        <head>
                                          <title>Purchase Invoice #${inv.invoiceNumber}</title>
                                          <style>
                                            @page { size: A4 portrait; margin: 12mm; }
                                            @media print {
                                              html, body { height: 100%; }
                                              body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #111; }
                                              .container { padding: 10mm; }
                                              .header { text-align: center; margin-bottom: 8mm; }
                                              .details { margin-bottom: 6mm; font-size: 12px; }
                                              table { width: 100%; border-collapse: collapse; font-size: 12px; }
                                              thead { display: table-header-group; }
                                              tfoot { display: table-footer-group; }
                                              th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; }
                                              th { background-color: #f3f4f6; }
                                              tr, td, th { break-inside: avoid; page-break-inside: avoid; }
                                              .total { font-weight: 700; }
                                            }
                                          </style>
                                        </head>
                                        <body>
                                          <div class="container">
                                            <div class="header">
                                              <h2 style="margin:0 0 4px 0;">Purchase Invoice</h2>
                                              <div style="font-size:12px;color:#444;">Invoice #: ${inv.invoiceNumber || 'N/A'}</div>
                                              <div style="font-size:12px;color:#444;">Date: ${inv.date?.toString()?.slice(0, 10) || 'N/A'}</div>
                                              <div style="font-size:12px;color:#444;">Supplier: ${inv.supplier || 'N/A'}</div>
                                            </div>
                                            <table>
                                            <thead>
                                              <tr>
                                                <th>Product</th>
                                                <th>Qty</th>
                                                <th>Weight</th>
                                                <th>Rate</th>
                                                <th>Value</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              ${(inv.items || []).map((item: any) => `
                                                <tr>
                                                  <td>${item.product || 'N/A'}</td>
                                                  <td>${item.qty || 0}</td>
                                                  <td>${item.weight || 0}</td>
                                                  <td>PKR ${item.rate || 0}</td>
                                                  <td>PKR ${item.value || 0}</td>
                                                </tr>
                                              `).join('')}
                                            </tbody>
                                            <tfoot>
                                              <tr>
                                                <td colspan="4" class="total" style="text-align:right;">Total Amount</td>
                                                <td class="total">PKR ${(inv.totalAmount?.toFixed?.(2) || inv.totalAmount || 0)}</td>
                                              </tr>
                                              <tr>
                                                <td colspan="4" style="text-align:right;">Discount</td>
                                                <td>PKR ${(inv.discount || 0)}</td>
                                              </tr>
                                              <tr>
                                                <td colspan="4" style="text-align:right;">Freight</td>
                                                <td>PKR ${(inv.freight || 0)}</td>
                                              </tr>
                                            </tfoot>
                                          </table>
                                          </div>
                                          <script>window.print();</script>
                                        </body>
                                      </html>
                                    `);
                                    printWindow.document.close();
                                  }
                                }}
                                className="text-green-600 hover:text-green-900 hover:bg-green-50 p-1 rounded transition-colors duration-200"
                                title="Print invoice"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => inv._id && deleteInvoice(inv._id)} 
                                className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded transition-colors duration-200"
                                title="Delete invoice"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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
