'use client';

import { useEffect, useMemo, useState } from 'react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import Layout from '@/components/Layout/Layout';
import { Loader2, Save, Printer } from 'lucide-react';

type PartyType = 'Customer' | 'Supplier';
type Mode = 'Cash' | 'Bank' | 'Cheque';

interface Option { _id: string; label: string; business?: string }
interface Payment {
  _id?: string;
  voucherNumber?: string;
  date: string;
  partyType: PartyType;
  partyId: string;
  mode: Mode;
  amount: number;
  notes?: string;
  // Cheque-related fields
  chequeNo?: string;
  bank?: string;
  issueDate?: string;
  dueDate?: string;
}

export default function PaymentPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const PAGE_LIMIT = 20;
  
  // Period totals state
  const [periodTotals, setPeriodTotals] = useState<any>(null);
  const [loadingPeriodTotals, setLoadingPeriodTotals] = useState(false);


  const [form, setForm] = useState<Payment>({
    date: new Date().toISOString().slice(0,10),
    partyType: 'Customer',
    partyId: '',
    mode: 'Cash',
    amount: 0,
    notes: '',
    chequeNo: '',
    bank: '',
    issueDate: new Date().toISOString().slice(0,10),
    dueDate: new Date().toISOString().slice(0,10),
  });

  const [partyInput, setPartyInput] = useState<string>(''); // For autocomplete input
  const [search, setSearch] = useState<string>(''); // For recent payments search

  const partyOptions = useMemo(() => {
    return form.partyType === 'Customer' ? customers : suppliers;
  }, [form.partyType, customers, suppliers]);

  // Map partyId -> label for quick lookup when rendering/searching
  const partyLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(c => map.set(c._id, c.label));
    suppliers.forEach(s => map.set(s._id, s.label || s.business || ''));
    return map;
  }, [customers, suppliers]);

  const loadParties = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/customers?limit=1000'),
        fetch('/api/suppliers?limit=1000'),
      ]);
      const [cData, sData] = await Promise.all([cRes.json(), sRes.json()]);
      setCustomers((cData.customers || []).map((c: any) => ({ _id: c._id, label: c.person ? `${c.person} (${c.description})` : c.description })));
      setSuppliers((sData.suppliers || []).map((s: any) => ({ _id: s._id, label: s.person ? `${s.person} (${s.description})` : s.description, business: s.business })));
    } catch (e) {
      console.error('Failed to load parties', e);
    }
  };

  const fetchPayments = async (isNewSearch = false) => {
    if (isFetching) return;
    setIsFetching(true);
    setLoading(true);

    const currentPage = isNewSearch ? 1 : page;
    const url = `/api/payments?page=${currentPage}&limit=${PAGE_LIMIT}&q=${search}`;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setPayments(prev => isNewSearch ? data.payments : [...prev, ...data.payments]);
        setHasMore(data.pagination.hasMore);
        if (isNewSearch) {
          setPage(2);
        } else {
          setPage(prev => prev + 1);
        }
      } else {
        console.error('Failed to load payments:', data.error);
        setErrorMsg(data.error || 'Failed to fetch payments.');
      }
    } catch (e) {
      console.error('Error fetching payments:', e);
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(true);
    loadParties();
    fetchPeriodTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-search when search text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments(true);
    }, 300); // Debounce for 300ms
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchPeriodTotals = async () => {
    setLoadingPeriodTotals(true);
    try {
      const res = await fetch('/api/payments?aggregatePeriods=true');
      const data = await res.json();
      if (res.ok) {
        setPeriodTotals(data.periodTotals || null);
      }
    } catch (error) {
      console.error('Error fetching period totals:', error);
    } finally {
      setLoadingPeriodTotals(false);
    }
  };

  const resetForm = () => {
    setSelected(null);
    setForm({ 
      date: new Date().toISOString().slice(0,10), 
      partyType: 'Customer', 
      partyId: '', 
      mode: 'Cash', 
      amount: 0, 
      notes: '',
      chequeNo: '',
      bank: '',
      issueDate: new Date().toISOString().slice(0,10),
      dueDate: new Date().toISOString().slice(0,10),
    });
    setPartyInput('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const save = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      if (!form.partyId) { setErrorMsg('Please select a party'); return; }
      if (!form.amount || form.amount <= 0) { setErrorMsg('Amount must be greater than 0'); return; }
      
      // Validate cheque fields if mode is Cheque
      if (form.mode === 'Cheque') {
        if (!form.chequeNo || !form.chequeNo.trim()) {
          setErrorMsg('Cheque number is required for Cheque mode');
          return;
        }
        if (!form.bank || !form.bank.trim()) {
          setErrorMsg('Bank name is required for Cheque mode');
          return;
        }
        
        // Check for duplicate cheque number (only for new cheques, not edits)
        if (!selected?._id) {
          const checkRes = await fetch(`/api/cheques?q=${encodeURIComponent(form.chequeNo)}`);
          const checkData = await checkRes.json();
          if (checkRes.ok && checkData.cheques && checkData.cheques.length > 0) {
            const duplicate = checkData.cheques.find((c: any) => 
              c.chequeNo.toLowerCase() === form.chequeNo!.toLowerCase()
            );
            if (duplicate) {
              setErrorMsg(`Duplicate cheque number: ${form.chequeNo} already exists`);
              return;
            }
          }
        }
      }
      
      const payload = { ...form, date: new Date(form.date).toISOString() };
      const url = selected?._id ? `/api/payments/${selected._id}` : '/api/payments';
      const method = selected?._id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Failed to save payment'); return; }
      await fetchPayments(true);
      await fetchPeriodTotals(); // Refresh period totals
      resetForm();
      setSuccessMsg('Payment saved');
    } catch (e) {
      console.error('Error saving payment:', e);
      setErrorMsg('Unexpected error while saving');
    } finally {
      setSaving(false);
    }
  };

  const edit = (p: Payment) => {
    setSelected(p);
    setForm({
      date: p.date?.slice(0,10) || new Date().toISOString().slice(0,10),
      partyType: p.partyType,
      partyId: p.partyId,
      mode: p.mode,
      amount: p.amount,
      notes: p.notes || '',
      _id: p._id,
      voucherNumber: p.voucherNumber,
      chequeNo: p.chequeNo || '',
      bank: p.bank || '',
      issueDate: p.issueDate?.slice(0,10) || new Date().toISOString().slice(0,10),
      dueDate: p.dueDate?.slice(0,10) || new Date().toISOString().slice(0,10),
    });
    
    // Set party input for autocomplete
    const list = p.partyType === 'Customer' ? customers : suppliers;
    const match = list.find(o => o._id === p.partyId);
    setPartyInput(match?.label || '');
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to delete payment');
        return;
      }
      if (selected?._id === id) resetForm();
      await fetchPayments(true);
      await fetchPeriodTotals(); // Refresh period totals
    } catch (e) {
      console.error('Error deleting payment:', e);
      setErrorMsg('Unexpected error while deleting');
    }
  };

  const printPayment = (payment: Payment) => {
    const partyName = partyLabelMap.get(payment.partyId) || 'N/A';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${payment.voucherNumber}</title>
        <style>
          @media print {
            @page { margin: 0.5cm; }
            body { margin: 0; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
          }
          .receipt-title {
            font-size: 18px;
            margin: 10px 0;
            color: #666;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          .info-row {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .label {
            font-weight: bold;
            width: 150px;
            color: #333;
          }
          .value {
            color: #666;
          }
          .amount-section {
            margin-top: 30px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          .amount {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .print-button {
            margin: 20px auto;
            display: block;
            padding: 10px 20px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          @media print {
            .print-button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="company-name">Amir Traders</h1>
          <p class="receipt-title">Payment Receipt</p>
          <p style="margin: 5px 0; color: #666;">Date & Time: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="info-grid">
          <div>
            <div class="info-row">
              <span class="label">Voucher #:</span>
              <span class="value">${payment.voucherNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Date:</span>
              <span class="value">${payment.date?.toString()?.slice(0,10) || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Party Type:</span>
              <span class="value">${payment.partyType}</span>
            </div>
            <div class="info-row">
              <span class="label">Party Name:</span>
              <span class="value">${partyName}</span>
            </div>
          </div>
          <div>
            <div class="info-row">
              <span class="label">Payment Mode:</span>
              <span class="value">${payment.mode}</span>
            </div>
            ${payment.mode === 'Cheque' ? `
              <div class="info-row">
                <span class="label">Cheque No:</span>
                <span class="value">${payment.chequeNo || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Bank:</span>
                <span class="value">${payment.bank || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Due Date:</span>
                <span class="value">${payment.dueDate?.toString()?.slice(0,10) || 'N/A'}</span>
              </div>
            ` : ''}
            <div class="info-row">
              <span class="label">Notes:</span>
              <span class="value">${payment.notes || '-'}</span>
            </div>
          </div>
        </div>
        
        <div class="amount-section">
          <div style="text-align: center;">
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Amount Paid</div>
            <div class="amount">PKR ${payment.amount?.toFixed?.(2) || payment.amount}</div>
          </div>
        </div>
        
        <div class="footer">
          <p>This is a computer-generated receipt and does not require a signature.</p>
          <p>© ${new Date().getFullYear()} Amir Traders. All rights reserved.</p>
        </div>
        
        <button class="print-button" onclick="window.print(); window.close();">Print Receipt</button>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between print:hidden gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage customer and supplier payments</p>
          </div>
          {/* New Payment button removed as requested */}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {/* Payment Management Form - Increased width */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full payment-print">
            {errorMsg && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200 mb-4">{errorMsg}</div>}
            {successMsg && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200 mb-4">{successMsg}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Party Type</label>
                <select value={form.partyType} onChange={(e) => {
                  setForm((p) => ({ ...p, partyType: e.target.value as PartyType, partyId: '' }));
                  setPartyInput(''); // Reset party input when type changes
                }} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="Customer">Customer</option>
                  <option value="Supplier">Supplier</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Party</label>
                <input
                  type="text"
                  value={partyInput}
                  onChange={(e) => {
                    setPartyInput(e.target.value);
                    // Find matching party and set partyId
                    const match = partyOptions.find(option => 
                      option.label.toLowerCase().includes(e.target.value.toLowerCase())
                    );
                    setForm(p => ({ ...p, partyId: match?._id || '' }));
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder={`Start typing ${form.partyType.toLowerCase()}...`}
                  list={`${form.partyType.toLowerCase()}-list`}
                  autoComplete="off"
                />
                <datalist id={`${form.partyType.toLowerCase()}-list`}>
                  {partyOptions.map(option => (
                    <option key={option._id} value={option.label} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                <select value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value as Mode }))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              
              {/* Cheque fields - Show only when mode is Cheque */}
              {form.mode === 'Cheque' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cheque No. *</label>
                    <input 
                      type="text" 
                      value={form.chequeNo || ''} 
                      onChange={(e) => setForm((p) => ({ ...p, chequeNo: e.target.value }))} 
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                      placeholder="Enter cheque number" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank *</label>
                    <input 
                      type="text" 
                      value={form.bank || ''} 
                      onChange={(e) => setForm((p) => ({ ...p, bank: e.target.value }))} 
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                      placeholder="Enter bank name" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                    <input 
                      type="date" 
                      value={form.issueDate || ''} 
                      onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))} 
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input 
                      type="date" 
                      value={form.dueDate || ''} 
                      onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} 
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </>
              )}
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value) || 0 }))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <input type="text" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={save} disabled={saving} className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{saving ? 'Saving...' : selected?._id ? 'Update Payment' : 'Save Payment'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Payments Section - Moved to bottom with increased width */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Recent Payments</h3>
          </div>
          <div className="mb-4">
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Voucher #, party, mode, amount, notes..."
              />
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && payments.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No payments found</td></tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.voucherNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.date?.toString()?.slice(0,10)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{p.partyType}</span>
                          <span className="text-gray-600 text-xs">{partyLabelMap.get(p.partyId) || '-'}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{p.mode}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{p.amount?.toFixed?.(2) || p.amount}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden md:table-cell">{p.notes || '-'}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <button onClick={() => printPayment(p)} className="text-green-600 hover:text-green-900 p-1" title="Print Receipt">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => edit(p)} className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm">Edit</button>
                          <button onClick={() => p._id && remove(p._id)} className="text-red-600 hover:text-red-900 text-xs sm:text-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={() => fetchPayments()}
                  disabled={isFetching}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400"
                >
                  {isFetching ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
