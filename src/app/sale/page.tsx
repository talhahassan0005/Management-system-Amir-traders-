'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout/Layout';
import { Save, Plus, Printer } from 'lucide-react';

interface SaleInvoiceItem {
  store: string;
  product: string;
  length: number;
  width: number;
  grams: number;
  description: string;
  packing: number;
  brand: string;
  reelNo: string;
  constant: string;
  pkt: number;
  weight: number;
  stock: number;
  baseStock?: number;
  rate: number;
  rateOn: string;
  remarks: string;
  value: number;
}

interface SaleInvoice {
  _id?: string;
  invoiceNumber: string;
  customer: string;
  cDays: number;
  date: string;
  reference: string;
  deliveredTo: string;
  limit: number;
  balance: number;
  paymentType: 'Cash' | 'Credit' | 'Code';
  deliveryAddress: string;
  adda: string;
  biltyNo: string;
  remarks: string;
  biltyDate: string;
  ctn: string;
  deliveredBy: string;
  items: SaleInvoiceItem[];
  totalAmount: number;
  discountPercent: number;
  discountRs: number;
  freight: number;
  labour: number;
  netAmount: number;
  receive: number;
  totalWeight: number;
}

// Stores will be loaded from API

export default function SaleInvoicePage() {
  // Search by Invoice # for Sales Records
  const [saleSearch, setSaleSearch] = useState('');
  const makeInitialInvoice = (): SaleInvoice => ({
    invoiceNumber: 'SI-017596',
    customer: '',
    cDays: 0,
    date: new Date().toISOString().split('T')[0],
    reference: '',
    deliveredTo: '',
    limit: 0,
    balance: 0,
    paymentType: 'Cash',
    deliveryAddress: '',
    adda: '',
    biltyNo: '',
    remarks: '',
    biltyDate: new Date().toISOString().split('T')[0],
    ctn: '',
    deliveredBy: '',
    items: [],
    totalAmount: 0,
    discountPercent: 0,
    discountRs: 0,
    freight: 0,
    labour: 0,
    netAmount: 0,
    receive: 0,
    totalWeight: 0,
  });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [saleInvoices, setSaleInvoices] = useState<SaleInvoice[]>([]);
  const [invoice, setInvoice] = useState<SaleInvoice>(makeInitialInvoice());

  const printRef = useRef<HTMLDivElement>(null);

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      const data = await response.json();
      
      if (response.ok) {
        setProducts(data.products || []);
      } else {
        console.error('Error fetching products:', data.error);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSaleInvoices = async () => {
    try {
      const response = await fetch('/api/sale-invoices?limit=100');
      const data = await response.json();
      
      if (response.ok) {
        setSaleInvoices(data.invoices || []);
      } else {
        console.error('Error fetching sale invoices:', data.error);
      }
    } catch (error) {
      console.error('Error fetching sale invoices:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSaleInvoices();
    // Load customers for dropdown
    (async () => {
      try {
        const res = await fetch('/api/customers?limit=1000');
        const data = await res.json();
        if (res.ok) setCustomers(data.customers || []);
        // Load stores for typeahead
        const sRes = await fetch('/api/stores?status=Active');
        const sData = await sRes.json();
        if (sRes.ok) setStores(sData.stores || []);
      } catch (e) { console.error('Error loading customers', e); }
    })();
  }, []);

  // Auto-fetch customer balance when customer changes
  useEffect(() => {
    const fetchBalance = async () => {
      const name = (invoice.customer || '').trim();
      if (!name) return;
      // find by contact person first, then description, then code
      const cust = customers.find((c: any) => c?.person === name || c?.description === name || c?.code === name);
      if (!cust?._id) return;
      try {
        const url = `/api/ledger?partyType=Customer&partyId=${encodeURIComponent(cust._id)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && Array.isArray(data.ledger)) {
          // Get the final balance from the last transaction entry
          const last = data.ledger[data.ledger.length - 1];
          const bal = last?.balance ?? 0;
          setInvoice(prev => ({ ...prev, balance: Number(bal) }));
        }
      } catch (err) {
        console.error('Failed to fetch customer balance', err);
      }
    };
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.customer, customers]);

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
    return length * width * grams; // reel or default
  };

  const handleInputChange = (field: keyof SaleInvoice, value: any) => {
    setInvoice(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleItemInputChange = (field: keyof SaleInvoiceItem, value: any) => {
    setCurrentItem(prev => {
      const next = { ...prev, [field]: value } as SaleInvoiceItem;
      // Auto-calc weight and value when pkt/rate/rateOn changes
      if (field === 'pkt' || field === 'rate' || field === 'rateOn') {
        const selectedProduct = products.find(p => p.item === next.product);
        const unitWeight = computeUnitWeight(selectedProduct);
        const pkt = Number(next.pkt || 0);
        const rate = Number(next.rate || 0);
        const rateOn = String(next.rateOn || 'Weight');
        const weight = +(pkt * unitWeight).toFixed(4);
        next.weight = weight;
        // Value based on selected basis
        next.value = +( (rateOn === 'Quantity' ? rate * pkt : rate * weight) ).toFixed(2);
      }
      return next;
    });
  };

  const [currentItem, setCurrentItem] = useState<SaleInvoiceItem>({
    store: 'GODOWN',
    product: '',
    length: 0,
    width: 0,
    grams: 0,
    description: '',
    packing: 100,
    brand: '',
    reelNo: '',
    constant: '',
    pkt: 0,
    weight: 0,
    stock: 0,
    rate: 0,
    rateOn: 'Weight',
    remarks: '',
    value: 0,
  });

  // Fetch stock when store and product change
  useEffect(() => {
    const fetchStock = async () => {
      const storeName = (currentItem.store || '').trim();
      const productCode = (currentItem.product || '').trim();
      if (!storeName || !productCode) {
        setCurrentItem(prev => ({ ...prev, stock: 0 }));
        return;
      }

      try {
        const response = await fetch(`/api/store-stock?store=${encodeURIComponent(storeName)}`);
        const data = await response.json();
        
        if (response.ok && data.data) {
          const stockItem = data.data.find((item: any) => 
            item.store === storeName && item.itemCode === productCode
          );
          
          if (stockItem) {
            setCurrentItem(prev => ({ 
              ...prev, 
              stock: stockItem.currentQty || 0,
              baseStock: stockItem.currentQty || 0
            }));
          } else {
            setCurrentItem(prev => ({ ...prev, stock: 0, baseStock: 0 }));
          }
        }
      } catch (error) {
        console.error('Error fetching stock:', error);
        setCurrentItem(prev => ({ ...prev, stock: 0, baseStock: 0 }));
      }
    };

    fetchStock();
  }, [currentItem.store, currentItem.product]);

  const handleAddItem = () => {
    if (currentItem.product && currentItem.description) {
      setInvoice(prev => ({
        ...prev,
        items: [...prev.items, { ...currentItem }],
      }));
      setCurrentItem({
        store: 'GODOWN',
        product: '',
        length: 0,
        width: 0,
        grams: 0,
        description: '',
        packing: 100,
        brand: '',
        reelNo: '',
        constant: '',
        pkt: 0,
        weight: 0,
        stock: 0,
        rate: 0,
        rateOn: 'Weight',
        remarks: '',
        value: 0,
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const totalAmount = invoice.items.reduce((sum, item) => sum + item.value, 0);
    const discountAmount = (totalAmount * invoice.discountPercent / 100) + invoice.discountRs;
    const netAmount = totalAmount - discountAmount + invoice.freight + invoice.labour;
    const totalWeight = invoice.items.reduce((sum, item) => sum + item.weight, 0);

    setInvoice(prev => ({
      ...prev,
      totalAmount,
      netAmount,
      totalWeight,
    }));
  };

  useEffect(() => {
    calculateTotals();
  }, [invoice.items, invoice.discountPercent, invoice.discountRs, invoice.freight, invoice.labour]);

  const handleSave = async () => {
    try {
      if (!invoice.customer.trim()) {
        alert('Please enter customer name');
        return;
      }
      if (invoice.items.length === 0) {
        alert('Please add at least one item');
        return;
      }
      const response = await fetch('/api/sale-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Invoice saved successfully!');
        // Reset invoice and item entry to initial state
        setInvoice(makeInitialInvoice());
        setCurrentItem({
          store: 'GODOWN',
          product: '',
          length: 0,
          width: 0,
          grams: 0,
          description: '',
          packing: 0,
          brand: '',
          reelNo: '',
          constant: '',
          pkt: 0,
          weight: 0,
          stock: 0,
          rate: 0,
          rateOn: 'Weight',
          remarks: '',
          value: 0,
        });
      } else {
        alert(`Error saving invoice: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const openPrintWindow = (html: string) => {
    const win = window.open('', 'PRINT', 'height=800,width=900');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${invoice.invoiceNumber}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          html, body { height: 100%; }
          body { font-family: ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial; padding: 0; margin: 0; color: #111; }
          .container { padding: 10mm; }
          h1,h2,h3{margin:0 0 8px 0}
          table{width:100%; border-collapse: collapse; font-size:12px; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          th,td{border:1px solid #bbb; padding:6px 8px;}
          th{background:#f3f4f6; text-align:left}
          tr, td, th { break-inside: avoid; page-break-inside: avoid; }
          .grid{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-bottom:12px}
          .totals{margin-top:12px; max-width:320px}
        }
      </style>
    </head><body>`);
    win.document.write(`<div class="container">${html}</div>`);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const renderInvoiceTable = () => `
    <table>
      <thead>
        <tr>
          <th>#</th><th>Store</th><th>Item</th><th>Description</th><th>Qty</th><th>Weight</th><th>Rate</th><th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((it, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${it.store}</td>
            <td>${it.product}</td>
            <td>${it.description}</td>
            <td>${it.pkt}</td>
            <td>${it.weight}</td>
            <td>${it.rate}</td>
            <td>${it.value}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const handlePrint = (type: 'combine' | 'single' | 'sale+do') => {
    const header = `
      <h2>Sale Invoice</h2>
      <div class="grid">
        <div><strong>Invoice#:</strong> ${invoice.invoiceNumber}</div>
        <div><strong>Date:</strong> ${invoice.date}</div>
        <div><strong>Customer:</strong> ${invoice.customer}</div>
        <div><strong>Delivered To:</strong> ${invoice.deliveredTo}</div>
      </div>
    `;

    const totals = `
      <div class="totals">
        <table>
          <tbody>
            <tr><th>Total Amount</th><td>${invoice.totalAmount.toFixed(2)}</td></tr>
            <tr><th>Discount %</th><td>${invoice.discountPercent}</td></tr>
            <tr><th>Discount Rs</th><td>${invoice.discountRs.toFixed(2)}</td></tr>
            <tr><th>Freight</th><td>${invoice.freight.toFixed(2)}</td></tr>
            <tr><th>Labour</th><td>${invoice.labour.toFixed(2)}</td></tr>
            <tr><th>Net Amount</th><td>${invoice.netAmount.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>
    `;

    if (type === 'single') {
      openPrintWindow(`
        ${header}
        ${renderInvoiceTable()}
        ${totals}
      `);
      return;
    }

    if (type === 'sale+do') {
      openPrintWindow(`
        <h1>Sale Invoice</h1>
        ${header}
        ${renderInvoiceTable()}
        ${totals}
        <hr style="margin:16px 0" />
        <h1>Delivery Order</h1>
        ${header}
        ${renderInvoiceTable()}
      `);
      return;
    }

    // combine default: two copies side by side
    openPrintWindow(`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          ${header}
          ${renderInvoiceTable()}
          ${totals}
        </div>
        <div>
          ${header}
          ${renderInvoiceTable()}
          ${totals}
        </div>
      </div>
    `);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sale Invoice</h1>
            <p className="text-gray-600">Create and manage sale invoices</p>
          </div>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200">
            Post
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Invoice Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sale Invoice</h2>
              
              {/* Invoice Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice #</label>
                  <input
                    type="text"
                    value={invoice.invoiceNumber}
                    onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                  <input
                    type="text"
                    value={invoice.customer}
                    onChange={(e) => handleInputChange('customer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Start typing customer..."
                    list="customer-list"
                    autoComplete="off"
                  />
                  <datalist id="customer-list">
                    {customers.map(c => (
                      <option key={c._id || c.code} value={c.person || c.description || c.code} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">C. Days</label>
                  <input
                    type="number"
                    value={invoice.cDays}
                    onChange={(e) => handleInputChange('cDays', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={invoice.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference#</label>
                  <input
                    type="text"
                    value={invoice.reference}
                    onChange={(e) => handleInputChange('reference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivered To</label>
                  <input
                    type="text"
                    value={invoice.deliveredTo}
                    onChange={(e) => handleInputChange('deliveredTo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Limit</label>
                  <input
                    type="number"
                    value={invoice.limit}
                    onChange={(e) => handleInputChange('limit', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Balance</label>
                  <input
                    type="number"
                    value={Number(invoice.balance || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    readOnly
                  />
                </div>
              </div>

              {/* Payment Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="Cash"
                      checked={invoice.paymentType === 'Cash'}
                      onChange={(e) => handleInputChange('paymentType', e.target.value)}
                      className="mr-2"
                    />
                    <span>Cash</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="Credit"
                      checked={invoice.paymentType === 'Credit'}
                      onChange={(e) => handleInputChange('paymentType', e.target.value)}
                      className="mr-2"
                    />
                    <span>Credit</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="Code"
                      checked={invoice.paymentType === 'Code'}
                      onChange={(e) => handleInputChange('paymentType', e.target.value)}
                      className="mr-2"
                    />
                    <span>Code</span>
                  </label>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                <textarea
                  value={invoice.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Bilty Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adda</label>
                  <input
                    type="text"
                    value={invoice.adda}
                    onChange={(e) => handleInputChange('adda', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bilty No.</label>
                  <input
                    type="text"
                    value={invoice.biltyNo}
                    onChange={(e) => handleInputChange('biltyNo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bilty Date</label>
                  <input
                    type="date"
                    value={invoice.biltyDate}
                    onChange={(e) => handleInputChange('biltyDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CTN</label>
                  <input
                    type="text"
                    value={invoice.ctn}
                    onChange={(e) => handleInputChange('ctn', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivered By</label>
                  <input
                    type="text"
                    value={invoice.deliveredBy}
                    onChange={(e) => handleInputChange('deliveredBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <input
                    type="text"
                    value={invoice.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
              </div>

              {/* Product Entry Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Entry</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Store</label>
                    <input
                      type="text"
                      value={currentItem.store}
                      onChange={(e) => handleItemInputChange('store', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Start typing store..."
                      list="store-list"
                      autoComplete="off"
                    />
                    <datalist id="store-list">
                      {stores.map((st: any) => (
                        <option key={st._id || st.store} value={st.store} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                    <select
                      value={currentItem.product}
                      onChange={(e) => {
                        const itemCode = e.target.value;
                        const selectedProduct = products.find(p => p.item === itemCode);
                        // set base fields
                        setCurrentItem(prev => {
                          const next = { ...prev, product: itemCode } as SaleInvoiceItem;
                        if (selectedProduct) {
                            next.description = selectedProduct.description || '';
                            next.brand = selectedProduct.brand || '';
                            next.length = Number(selectedProduct.length || 0);
                            next.width = Number(selectedProduct.width || 0);
                            next.grams = Number(selectedProduct.grams || 0);
                            next.constant = selectedProduct.type || '';
                            next.packing = Number(selectedProduct.pktPerReem || selectedProduct.sheetsPerPkt || 0);
                            // recompute weight/value based on existing pkt and rate
                            const unitWeight = computeUnitWeight(selectedProduct);
                            const pkt = Number(next.pkt || 0);
                            const rate = Number(next.rate || 0);
                            const weight = +(pkt * unitWeight).toFixed(4);
                            next.weight = weight;
                            next.value = +(rate * weight).toFixed(2);
                          }
                          return next;
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    >
                      <option value="">Select Product</option>
                      {products.map(product => (
                        <option key={product.item} value={product.item}>{product.item}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Length</label>
                    <input
                      type="number"
                      value={currentItem.length === 0 ? '' : currentItem.length}
                      onChange={(e) => handleItemInputChange('length', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                    <input
                      type="number"
                      value={currentItem.width === 0 ? '' : currentItem.width}
                      onChange={(e) => handleItemInputChange('width', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grams</label>
                    <input
                      type="number"
                      value={currentItem.grams === 0 ? '' : currentItem.grams}
                      onChange={(e) => handleItemInputChange('grams', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descrip.</label>
                    <input
                      type="text"
                      value={currentItem.description}
                      onChange={(e) => handleItemInputChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Packing</label>
                    <input
                      type="number"
                      value={currentItem.packing === 0 ? '' : currentItem.packing}
                      onChange={(e) => handleItemInputChange('packing', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                    <input
                      type="text"
                      value={currentItem.brand}
                      onChange={(e) => handleItemInputChange('brand', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reel#</label>
                    <input
                      type="text"
                      value={currentItem.reelNo}
                      onChange={(e) => handleItemInputChange('reelNo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Constant</label>
                    <select
                      value={currentItem.constant}
                      onChange={(e) => handleItemInputChange('constant', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    >
                      <option value="">Select</option>
                      <option value="Board">Board</option>
                      <option value="Reel">Reel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pkt</label>
                    <input
                      type="number"
                      value={currentItem.pkt === 0 ? '' : currentItem.pkt}
                      onChange={(e) => handleItemInputChange('pkt', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.weight}
                      onChange={(e) => handleItemInputChange('weight', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                    <input
                      type="number"
                      value={currentItem.stock}
                      onChange={(e) => handleItemInputChange('stock', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.rate}
                      onChange={(e) => handleItemInputChange('rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rate On</label>
                    <select
                      value={currentItem.rateOn}
                      onChange={(e) => handleItemInputChange('rateOn', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    >
                      <option value="Weight">Weight</option>
                      <option value="Quantity">Quantity</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                    <input
                      type="text"
                      value={currentItem.remarks}
                      onChange={(e) => handleItemInputChange('remarks', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.value}
                      onChange={(e) => handleItemInputChange('value', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      readOnly
                    />
                  </div>
                  
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={handleAddItem}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Grid</span>
                  </button>
                  <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors duration-200">
                    Change Grid
                  </button>
                  <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200">
                    Remove Grid
                  </button>
                </div>
              </div>

              {/* Items Table */}
              {invoice.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h3>
                  <div className="overflow-x-auto">
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
                        {invoice.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.store}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.product}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.pkt}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.weight}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.value}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleRemoveItem(index)}
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
                </div>
              )}

              {/* Totals Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.totalAmount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Disc % / Rs.</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      value={invoice.discountPercent}
                      onChange={(e) => handleInputChange('discountPercent', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="%"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={invoice.discountRs}
                      onChange={(e) => handleInputChange('discountRs', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Rs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Freight</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.freight}
                    onChange={(e) => handleInputChange('freight', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Labour</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.labour}
                    onChange={(e) => handleInputChange('labour', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Net Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.netAmount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receive</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.receive}
                    onChange={(e) => handleInputChange('receive', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.netAmount - invoice.receive}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Weight</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.totalWeight}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleSave}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>Save</span>
            </button>
            
            {/* Print Options */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Print Options</h4>
              <button
                onClick={() => handlePrint('combine')}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2 mb-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Combine</span>
              </button>
              <button
                onClick={() => handlePrint('single')}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2 mb-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Single</span>
              </button>
              <button
                onClick={() => handlePrint('sale+do')}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Sale+DO</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hidden printable content anchor */}
        <div ref={printRef} style={{ display: 'none' }} />

        {/* Sales Records Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Sales Records</h3>
              <div className="w-64">
                <input
                  type="text"
                  value={saleSearch}
                  onChange={(e) => setSaleSearch(e.target.value)}
                  placeholder="Search by Invoice #"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {saleInvoices
                    .filter((si) =>
                      saleSearch.trim() === ''
                        ? true
                        : String(si.invoiceNumber || '')
                            .toLowerCase()
                            .includes(saleSearch.trim().toLowerCase())
                    )
                    .map((saleInvoice: any) => (
                    <tr key={saleInvoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {saleInvoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(saleInvoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {saleInvoice.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        PKR {saleInvoice.netAmount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setInvoice({
                              ...saleInvoice,
                              items: saleInvoice.items || []
                            });
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this sale invoice?')) {
                              try {
                                const response = await fetch(`/api/sale-invoices/${saleInvoice._id}`, {
                                  method: 'DELETE',
                                });
                                if (response.ok) {
                                  fetchSaleInvoices(); // Refresh the list
                                } else {
                                  console.error('Failed to delete sale invoice');
                                }
                              } catch (error) {
                                console.error('Error deleting sale invoice:', error);
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            // Set the invoice data for printing
                            setInvoice({
                              ...saleInvoice,
                              items: saleInvoice.items || []
                            });
                            // Trigger print after a short delay to ensure state is updated
                            setTimeout(() => handlePrint('single'), 100);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {saleInvoices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No sales records found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
