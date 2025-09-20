'use client';

import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    const d = new Date();
    // Use fixed locale to avoid hydration mismatch
    setAsOnDate(new Intl.DateTimeFormat('en-GB').format(d));
    setAsOnTime(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d));
  }, []);

  const fetchRows = async () => {
    try {
      setLoading(true);
      // For now, let's load all data without date filtering to test
      const [stockRes, prodRes, piRes, prRes] = await Promise.all([
        fetch(`/api/store-stock`),
        fetch(`/api/products?limit=1000`),
        fetch(`/api/purchase-invoices?limit=1000`),
        fetch(`/api/production?limit=1000`),
      ]);
      const [stockJson, prodJson, piJson, prJson] = await Promise.all([stockRes.json(), prodRes.json(), piRes.json(), prRes.json()]);
      const stock: any[] = stockRes.ok ? (stockJson.data || []) : [];
      const prods: any[] = prodRes.ok ? (prodJson.products || []) : [];
      const pis: any[] = piRes.ok ? (piJson.invoices || []) : [];
      const productions: any[] = prRes.ok ? (prJson.productions || []) : [];

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
          packets: s.currentQty || 0,
          weightKg: s.currentWeight || 0,
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

    useEffect(() => { fetchRows(); }, [from, to]); // Auto-load data when dates change
  useEffect(() => { 
    // Auto-refresh when dates change (but only if Apply button behavior is not preferred)
    // Comment this out if you want Apply-only behavior
    fetchRows(); 
  }, [from, to]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter(r => r.itemCode.toLowerCase().includes(s) || r.description.toLowerCase().includes(s));
  }, [rows, q]);

  const exportCSV = () => {
    const header = ['Sr#','Item Code','Description','Length','Width','Grams','Reel No.','Type','Packet','Weight','Produced (Pkt)','Purchased (Pkt)','Date','Purchased From'];
    const rowsCsv = filtered.map((r, idx) => [idx+1, r.itemCode, r.description, r.length ?? '', r.width ?? '', r.grams ?? '', '', r.type ?? '', r.packets ?? '', r.weightKg ?? '', r.producedPkt ?? '', r.purchasedPkt ?? '', r.date ?? '', r.purchasedFrom || '']);
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
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock/Godown Report</h1>
            <p className="text-gray-600">As on {asOnDate}</p>
          </div>
          <div className="flex gap-2 items-center">
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="px-3 py-2 border rounded-lg" />
            <span className="text-gray-500">to</span>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="px-3 py-2 border rounded-lg" />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search item/description" className="px-3 py-2 border rounded-lg" />
            <button onClick={exportCSV} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Export</button>
            <button onClick={()=>window.print()} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Print</button>
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
                  <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-600">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-600">No items</td></tr>
                ) : (
                  filtered.map((r, idx) => (
                    <tr key={`${r.itemCode}-${idx}`} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50">
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 font-medium">{idx + 1}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.itemCode}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.description}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.length ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.width ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{r.grams ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-500">-</td>
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
