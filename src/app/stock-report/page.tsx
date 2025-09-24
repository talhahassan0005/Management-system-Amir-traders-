'use client';

import { useEffect, useMemo, useState } from 'react';
import { Filter as FilterIcon, RefreshCw, XCircle, Download, Printer, Search } from 'lucide-react';
import Layout from '@/components/Layout/Layout';

interface MergedRow {
  _id: string;
  itemCode: string;
  description: string;
  length?: number;
  width?: number;
  grams?: number;
  type?: string; // Reel/Board
  constant?: string; // Legacy field if used
  brand?: string;
  category?: string;
  reelNo?: string;
  store?: string;
  packets?: number; // current stock packets
  weightKg?: number; // derived/current stock weight for valuation
  producedPkt?: number;
  purchasedPkt?: number;
  purchasedFrom?: string; // supplier:qty pairs
  date?: string; // latest of production or purchase date
}

export default function StockReportPage() {
  const [rows, setRows] = useState<MergedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [asOnDate, setAsOnDate] = useState('');
  const [asOnTime, setAsOnTime] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stores, setStores] = useState<string[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Toggleable filters
  const [useStore, setUseStore] = useState(false);
  const [filterStore, setFilterStore] = useState('');
  const [useCategory, setUseCategory] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [useBrand, setUseBrand] = useState(false);
  const [filterBrand, setFilterBrand] = useState('');
  const [useGrams, setUseGrams] = useState(false);
  const [filterGrams, setFilterGrams] = useState('');
  const [useLength, setUseLength] = useState(false);
  const [filterLength, setFilterLength] = useState('');
  const [useWidth, setUseWidth] = useState(false);
  const [filterWidth, setFilterWidth] = useState('');
  const [useItemCode, setUseItemCode] = useState(false);
  const [filterItemCode, setFilterItemCode] = useState('');
  const [useReelNo, setUseReelNo] = useState(false);
  const [filterReelNo, setFilterReelNo] = useState('');

  useEffect(() => {
    const d = new Date();
    // Use fixed locale to avoid hydration mismatch
    setAsOnDate(new Intl.DateTimeFormat('en-GB').format(d));
    setAsOnTime(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d));
    // Default Upto date to today
    try {
      setTo(d.toISOString().slice(0, 10));
    } catch {}
  }, []);

  const fetchRows = async () => {
    try {
      setLoading(true);
      // For now, let's load all data without date filtering to test
      const [stockRes, prodRes, piRes, prRes, storesRes] = await Promise.all([
        fetch(`/api/store-stock`),
        fetch(`/api/products?limit=1000`),
        fetch(`/api/purchase-invoices?limit=1000${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`),
        fetch(`/api/production?limit=1000${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`),
        fetch(`/api/stores?limit=1000`)
      ]);
      const [stockJson, prodJson, piJson, prJson, storesJson] = await Promise.all([stockRes.json(), prodRes.json(), piRes.json(), prRes.json(), storesRes.json()]);
      const stock: any[] = stockRes.ok ? (stockJson.data || []) : [];
      const prods: any[] = prodRes.ok ? (prodJson.products || []) : [];
      const pis: any[] = piRes.ok ? (piJson.invoices || []) : [];
      const productions: any[] = prRes.ok ? (prJson.productions || []) : [];
      const storeList: any[] = storesRes.ok ? (storesJson.stores || []) : [];
      setStores(storeList.map((s: any) => s.store).filter(Boolean));
      setAllBrands(Array.from(new Set(prods.map((p: any) => p.brand).filter(Boolean))).sort());
      setAllCategories(Array.from(new Set(prods.map((p: any) => p.category).filter(Boolean))).sort());

      console.log('Stock Report Debug:', {
        stockCount: stock.length,
        prodsCount: prods.length,
        pisCount: pis.length,
        productionsCount: productions.length,
        stockSample: stock.slice(0, 2),
        fromDate: from,
        toDate: to
      });
      const byItem = new Map<string, any>();
      const byIdToItem = new Map<string, string>();
      for (const p of prods) { byItem.set(p.item, p); byIdToItem.set(String(p._id), p.item); }
      // Aggregate purchases by item and supplier
      const purchaseByItem = new Map<string, { total: number; supplierMap: Map<string, number>, lastDate?: number }>();
      for (const inv of pis) {
        const supplier = inv.supplier || 'Unknown';
        const invDate = inv.date ? +new Date(inv.date) : undefined;
        for (const it of inv.items || []) {
          const key = it.product;
          if (!key) continue;
          const entry = purchaseByItem.get(key) || { total: 0, supplierMap: new Map(), lastDate: undefined };
          entry.total += Number(it.qty || 0);
          entry.supplierMap.set(supplier, (entry.supplierMap.get(supplier) || 0) + Number(it.qty || 0));
          if (invDate && (!entry.lastDate || invDate > entry.lastDate)) entry.lastDate = invDate;
          purchaseByItem.set(key, entry);
        }
      }

      // Aggregate production by productId
      const producedByItem = new Map<string, { total: number, lastDate?: number }>();
      for (const pr of productions) {
        const prDate = pr.date ? +new Date(pr.date) : undefined;
        for (const it of pr.items || []) {
          const itemCode = byIdToItem.get(String(it.productId));
          if (!itemCode) continue;
          const entry = producedByItem.get(itemCode) || { total: 0, lastDate: undefined };
          entry.total += Number(it.quantityPkts || 0);
          if (prDate && (!entry.lastDate || prDate > entry.lastDate)) entry.lastDate = prDate;
          producedByItem.set(itemCode, entry);
        }
      }

      const merged: MergedRow[] = stock.length > 0 ? stock.map(s => {
        const p = byItem.get(s.itemCode) || {};
        const purchase = purchaseByItem.get(s.itemCode);
        const produced = producedByItem.get(s.itemCode);
        const purchasedFrom = purchase ? Array.from(purchase.supplierMap.entries()).map(([sup,qty]) => `${sup}: ${qty}`).join('; ') : '';
        const format = (ts?: number) => ts ? new Intl.DateTimeFormat('en-GB').format(new Date(ts)) : undefined;
        const latestTs = (produced?.lastDate || 0) > (purchase?.lastDate || 0) ? produced?.lastDate : purchase?.lastDate;
        return {
          _id: s._id || s.itemCode,
          itemCode: s.itemCode,
          description: s.description || p.description || '',
          length: p.length,
          width: p.width,
          grams: p.grams,
          type: p.type,
          constant: p.constant,
          brand: p.brand,
          category: p.category,
          reelNo: s.reelNo,
          store: s.store,
          packets: s.currentQty || s.currentQty === 0 ? s.currentQty : s.currentQty, // keep as provided
          weightKg: s.currentWeight || s.currentWeight === 0 ? s.currentWeight : s.currentWeight,
          producedPkt: produced?.total || 0,
          purchasedPkt: purchase?.total || 0,
          purchasedFrom,
          date: format(latestTs),
        };
      }) : [];
      
      console.log('Merged rows:', merged.length);
      setRows(merged);
    } catch (e) { console.error('Error loading stock report', e); }
    finally { setLoading(false); }
  };

    useEffect(() => { fetchRows(); }, []); // initial load

  const filtered = useMemo(() => {
    let out = rows;
    const search = q.trim().toLowerCase();
    if (search) {
      out = out.filter(r => r.itemCode.toLowerCase().includes(search) || r.description.toLowerCase().includes(search));
    }
    // Apply toggle filters
    out = out.filter(r => {
      const pMeta = (key: string): any => (r as any)[key] ?? ({} as any)[key];
      const brand = pMeta('brand')?.toLowerCase?.() || '';
      const category = pMeta('category')?.toLowerCase?.() || '';
      const grams = pMeta('grams');
      const length = pMeta('length');
      const width = pMeta('width');
      const reelNo = pMeta('reelNo')?.toLowerCase?.() || '';
      const store = (pMeta('store') || (r as any).store || '').toLowerCase();
      if (useStore && filterStore && store !== filterStore.toLowerCase()) return false;
      if (useCategory && filterCategory && category !== filterCategory.toLowerCase()) return false;
      if (useBrand && filterBrand && brand !== filterBrand.toLowerCase()) return false;
      if (useGrams && filterGrams && String(grams) !== String(filterGrams)) return false;
      if (useLength && filterLength && String(length) !== String(filterLength)) return false;
      if (useWidth && filterWidth && String(width) !== String(filterWidth)) return false;
      if (useItemCode && filterItemCode && !r.itemCode.toLowerCase().includes(filterItemCode.toLowerCase())) return false;
      if (useReelNo && filterReelNo && reelNo !== filterReelNo.toLowerCase()) return false;
      return true;
    });
    return out;
  }, [rows, q, useStore, filterStore, useCategory, filterCategory, useBrand, filterBrand, useGrams, filterGrams, useLength, filterLength, useWidth, filterWidth, useItemCode, filterItemCode, useReelNo, filterReelNo]);

  const exportCSV = () => {
  const header = ['Sr#','Item Code','Description','Length','Width','Grams','Reel No.','Type','Packet','Weight','Produced (Pkt)','Purchased (Pkt)','Date','Purchased From'];
  const rowsCsv = filtered.map((r, idx) => [idx+1, r.itemCode, r.description, r.length ?? '', r.width ?? '', r.grams ?? '', r.reelNo ?? '', r.type ?? '', r.packets ?? '', r.weightKg ?? '', r.producedPkt ?? '', r.purchasedPkt ?? '', r.date ?? '', r.purchasedFrom || '']);
    const csv = [header, ...rowsCsv].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'stock-godown-report.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-4">
        <style>{`
          @media print {
            @page { size: landscape; margin: 10mm; }
            .print-container { padding: 0 !important; }
            .no-print-overflow { overflow: visible !important; }
            .print-table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .print-table th, .print-table td { padding: 4px 6px !important; }
          }
        `}</style>
        <div className="print:hidden">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stock/Godown Report</h1>
                <p className="text-gray-600">As on {asOnDate}</p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-gray-600">
                <FilterIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Filters</span>
              </div>
            </div>

            {/* Toggle chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              <label className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none ${useCategory ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                <input type="checkbox" className="mr-2 align-middle" checked={useCategory} onChange={e=>setUseCategory(e.target.checked)} />Category
              </label>
              <label className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none ${useBrand ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                <input type="checkbox" className="mr-2 align-middle" checked={useBrand} onChange={e=>setUseBrand(e.target.checked)} />Brand
              </label>
              <label className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none ${useGrams ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                <input type="checkbox" className="mr-2 align-middle" checked={useGrams} onChange={e=>setUseGrams(e.target.checked)} />Grams
              </label>
              <label className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none ${useLength ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                <input type="checkbox" className="mr-2 align-middle" checked={useLength} onChange={e=>setUseLength(e.target.checked)} />Length
              </label>
              <label className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none ${useWidth ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                <input type="checkbox" className="mr-2 align-middle" checked={useWidth} onChange={e=>setUseWidth(e.target.checked)} />Width
              </label>
              <label className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none ${useItemCode ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                <input type="checkbox" className="mr-2 align-middle" checked={useItemCode} onChange={e=>setUseItemCode(e.target.checked)} />Item Code
              </label>
              <label className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none ${useReelNo ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                <input type="checkbox" className="mr-2 align-middle" checked={useReelNo} onChange={e=>setUseReelNo(e.target.checked)} />Reel No.
              </label>
              <label className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none ${useStore ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                <input type="checkbox" className="mr-2 align-middle" checked={useStore} onChange={e=>setUseStore(e.target.checked)} />Store
              </label>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-3">
              <select disabled={!useCategory} value={filterCategory} onChange={e=>{ const v=e.target.value; setFilterCategory(v); setUseCategory(!!v); }} className="h-11 px-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100">
                <option value="">All</option>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select disabled={!useBrand} value={filterBrand} onChange={e=>{ const v=e.target.value; setFilterBrand(v); setUseBrand(!!v); }} className="h-11 px-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100">
                <option value="">All</option>
                {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <input disabled={!useGrams} type="number" value={filterGrams} onChange={e=>{ const v=e.target.value; setFilterGrams(v); setUseGrams(v !== ''); }} placeholder="Grams" className="h-11 px-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100" />
              <input disabled={!useLength} type="number" value={filterLength} onChange={e=>{ const v=e.target.value; setFilterLength(v); setUseLength(v !== ''); }} placeholder="Length" className="h-11 px-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100" />
              <input disabled={!useWidth} type="number" value={filterWidth} onChange={e=>{ const v=e.target.value; setFilterWidth(v); setUseWidth(v !== ''); }} placeholder="Width" className="h-11 px-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100" />
              <input disabled={!useItemCode} value={filterItemCode} onChange={e=>{ const v=e.target.value; setFilterItemCode(v); setUseItemCode(v.trim() !== ''); }} placeholder="Item Code" className="h-11 px-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100" />
              <input disabled={!useReelNo} value={filterReelNo} onChange={e=>{ const v=e.target.value; setFilterReelNo(v); setUseReelNo(v.trim() !== ''); }} placeholder="Reel No" className="h-11 px-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100" />
              <select disabled={!useStore} value={filterStore} onChange={e=>{ const v=e.target.value; setFilterStore(v); setUseStore(!!v); }} className="h-11 px-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100">
                <option value="">All Stores</option>
                {stores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Dates, Search, Actions */}
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 text-sm">From</span>
                  <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="h-11 px-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 text-sm">Upto</span>
                  <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="h-11 px-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search item/description" className="h-11 pl-9 pr-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <button onClick={fetchRows} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                  <FilterIcon className="w-4 h-4" />
                  <span>View</span>
                </button>
                <button onClick={() => { setQ(''); setFilterBrand(''); setFilterCategory(''); setFilterGrams(''); setFilterLength(''); setFilterWidth(''); setFilterItemCode(''); setFilterReelNo(''); setFilterStore(''); setUseBrand(false); setUseCategory(false); setUseGrams(false); setUseLength(false); setUseWidth(false); setUseItemCode(false); setUseReelNo(false); setUseStore(false); fetchRows(); }} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200">
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                <button onClick={() => { setQ(''); setFilterBrand(''); setFilterCategory(''); setFilterGrams(''); setFilterLength(''); setFilterWidth(''); setFilterItemCode(''); setFilterReelNo(''); setFilterStore(''); setUseBrand(false); setUseCategory(false); setUseGrams(false); setUseLength(false); setUseWidth(false); setUseItemCode(false); setUseReelNo(false); setUseStore(false); }} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">
                  <XCircle className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button onClick={exportCSV} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <button onClick={()=>window.print()} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-0 p-4 print-container">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Amir Traders – Stock/Godown Report</h2>
            <div className="text-sm text-gray-700">As on {asOnDate} {asOnTime}</div>
          </div>
          <div className="overflow-x-auto no-print-overflow">
            <table className="min-w-full border border-gray-300 print-table">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Sr#</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Item Code</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Description</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Length</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Width</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Grams</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Reel No.</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Type</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Packet</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Weight</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Produced (Pkt)</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Purchased (Pkt)</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Date</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">Purchased From</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={14} className="px-6 py-8 text-center text-gray-600">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={14} className="px-6 py-8 text-center text-gray-600">No items</td></tr>
                ) : (
                  filtered.map((r, idx) => (
                    <tr key={`${r.itemCode}-${idx}`} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50">
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 font-medium">{idx + 1}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.itemCode}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.description}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.length ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.width ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.grams ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.reelNo || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.type ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.packets ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.weightKg ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.producedPkt ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.purchasedPkt ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.date || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.purchasedFrom || '-'}</td>
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
