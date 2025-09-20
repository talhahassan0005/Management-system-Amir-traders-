'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout/Layout';

type PartyType = 'Customer' | 'Supplier';
interface Option { _id: string; label: string }
interface Row { 
  date: string; 
  voucherNo: string; 
  qty?: number;
  weight?: number;
  itemName?: string;
  rate?: number;
  reelNo?: string;
  debit: number; 
  credit: number; 
  balance: number 
}

export default function LedgerReportPage() {
  const [partyType, setPartyType] = useState<PartyType>('Customer');
  const [partyId, setPartyId] = useState('');
  const [customers, setCustomers] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const partyOptions = useMemo(() => partyType === 'Customer' ? customers : suppliers, [partyType, customers, suppliers]);

  const loadParties = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/customers?limit=1000'),
        fetch('/api/suppliers?limit=1000'),
      ]);
      const [cData, sData] = await Promise.all([cRes.json(), sRes.json()]);
      setCustomers((cData.customers || []).map((c: any) => ({ _id: c._id, label: c.person ? `${c.person} (${c.description})` : c.description })));
      setSuppliers((sData.suppliers || []).map((s: any) => ({ _id: s._id, label: s.person ? `${s.person} (${s.description})` : s.description })));
    } catch (e) { console.error('Failed to load parties', e); }
  };

  useEffect(() => { loadParties(); }, []);
  // Avoid hydration mismatch: render date/time only after mount
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadLedger = async () => {
    try {
      if (!partyId) { setErrorMsg('Select a party'); return; }
      setLoading(true); setErrorMsg(null);
      const params = new URLSearchParams({ partyType, partyId });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/ledger?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Failed to load ledger'); return; }
      const ledger = (data.ledger || []).map((r: any) => ({
        date: (r.date && typeof r.date === 'string') ? r.date.slice(0,10) : new Date(r.date).toISOString().slice(0,10),
        voucherNo: r.voucherNo,
        debit: r.debit,
        credit: r.credit,
        balance: r.balance,
        qty: r.qty,
        weight: r.weight,
        itemName: r.itemName,
        rate: r.rate,
        reelNo: r.reelNo,
      }));
      setRows(ledger);
    } catch (e) { setErrorMsg('Unexpected error while loading'); }
    finally { setLoading(false); }
  };

  const totals = useMemo(() => {
    const debit = rows.reduce((s,r)=>s + (Number(r.debit)||0), 0);
    const credit = rows.reduce((s,r)=>s + (Number(r.credit)||0), 0);
    const balance = rows.length ? rows[rows.length-1].balance : 0;
    return { debit, credit, balance };
  }, [rows]);

  const printPage = () => window.print();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ledger Report</h1>
            <p className="text-gray-600" suppressHydrationWarning>As on {now ? new Intl.DateTimeFormat('en-GB').format(now) : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadLedger} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Load</button>
            <button onClick={printPage} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Print</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 print:shadow-none print:border-0">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 print:hidden">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Party Type</label>
              <select value={partyType} onChange={e=>{ setPartyType(e.target.value as PartyType); setPartyId(''); }} className="w-full px-3 py-2 border rounded-lg">
                <option value="Customer">Customer</option>
                <option value="Supplier">Supplier</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Party</label>
              <select value={partyId} onChange={e=>setPartyId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select {partyType}</option>
                {partyOptions.map(p => <option key={p._id} value={p._id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="flex items-end">
              <button onClick={loadLedger} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Apply</button>
            </div>
          </div>

          <div className="mt-4 print:mt-0">
            <div className="flex justify-between items-start mb-4">
              <div className="text-left">
                <div className="text-sm text-gray-600">Page 1 of 1</div>
                <div className="text-sm text-gray-600">A/C Code: {partyId ? partyId.slice(-6) : '...'}</div>
                <div className="text-sm text-gray-600">A/C Description: {partyOptions.find(p => p._id === partyId)?.label || '...'}</div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">Ledger Report</h2>
                <div className="text-sm text-gray-600">From Date: {from ? new Date(from).toLocaleDateString('en-GB') : '...'}</div>
                <div className="text-sm text-gray-600">To Date: {to ? new Date(to).toLocaleDateString('en-GB') : '...'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600" suppressHydrationWarning>{now ? new Intl.DateTimeFormat('en-GB').format(now) : ''}</div>
                <div className="text-sm text-gray-600" suppressHydrationWarning>{now ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now) : ''}</div>
                <div className="text-sm text-gray-600">Balance Before: (0.00)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-0">
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-900">Sr#</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-900">Date</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-900">Voucher #</th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-900">Qty</th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-900">Weight</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-900">Item Name / Remarks</th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-900">Rate</th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-900">Reel No.</th>
                  <th className="border border-gray-300 px-2 py-2 text-right text-xs font-semibold text-gray-900">Debit</th>
                  <th className="border border-gray-300 px-2 py-2 text-right text-xs font-semibold text-gray-900">Credit</th>
                  <th className="border border-gray-300 px-2 py-2 text-right text-xs font-semibold text-gray-900">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-500">No records</td></tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-1 text-xs text-gray-900">{idx + 1}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-gray-900">{r.date}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-gray-900">{r.voucherNo}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-900">{r.qty || ''}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-900">{r.weight || ''}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-gray-900">{r.itemName || ''}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-900">{r.rate || ''}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-900">{r.reelNo || ''}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-right text-gray-900">{r.debit ? r.debit.toFixed(2) : ''}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-right text-gray-900">{r.credit ? r.credit.toFixed(2) : ''}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-right text-gray-900">{r.balance?.toFixed?.(2) || r.balance}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border border-gray-300 px-2 py-2 text-xs text-gray-900" colSpan={8}>Totals</td>
                  <td className="border border-gray-300 px-2 py-2 text-xs text-right text-gray-900">{totals.debit.toFixed(2)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-xs text-right text-gray-900">{totals.credit.toFixed(2)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-xs text-right text-gray-900">{totals.balance.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
