'use client';
import React from 'react';

interface FilterProps {
  onChange?: (filters: any) => void;
  show?: Partial<{ from: boolean; to: boolean; product: boolean; store: boolean; customer: boolean; supplier: boolean; saleType: boolean }>;
  initial?: Partial<{ from: string; to: string; product: string; store: string; customer: string; supplier: string; saleType: string }>;
}

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Note: We intentionally do NOT default the "from" date; leave it empty by default.

export default function Filter({ onChange, show, initial }: FilterProps) {
  const visibility = {
    from: true,
    to: true,
    product: true,
    store: true,
    customer: true,
    supplier: false,
    saleType: false,
    ...(show || {}),
  };

  const initVals = {
    from: '',
    to: getTodayDate(),
    product: '',
    store: '',
    customer: '',
    supplier: '',
    saleType: '',
    ...(initial || {}),
  };

  const [from, setFrom] = React.useState(initVals.from);
  const [to, setTo] = React.useState(initVals.to);
  const [product, setProduct] = React.useState(initVals.product);
  const [store, setStore] = React.useState(initVals.store);
  const [customer, setCustomer] = React.useState(initVals.customer);
  const [supplier, setSupplier] = React.useState(initVals.supplier || '');
  const [saleType, setSaleType] = React.useState(initVals.saleType || '');

  // Fetch data for autocomplete
  const [products, setProducts] = React.useState<any[]>([]);
  const [stores, setStores] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [suppliers, setSuppliers] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Fetch products
    fetch('/api/products')
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => setProducts([]));

    // Fetch stores (load many so dropdown is complete)
    fetch('/api/stores?status=Active&limit=1000')
      .then(r => r.json())
      .then(d => setStores(d.stores || []))
      .catch(() => setStores([]));

    // Fetch customers
    fetch('/api/customers?limit=1000')
      .then(r => r.json())
      .then(d => setCustomers(d.customers || []))
      .catch(() => setCustomers([]));

    // Fetch suppliers
    fetch('/api/suppliers?limit=1000')
      .then(r => r.json())
      .then(d => setSuppliers(d.suppliers || []))
      .catch(() => setSuppliers([]));
  }, []);

  const handleApply = () => {
    if (onChange) onChange({ from, to, product, store, customer, supplier, saleType });
  };

  const handleClear = () => {
    setFrom(initVals.from);
    setTo(initVals.to);
    setProduct(initVals.product);
    setStore(initVals.store);
    setCustomer(initVals.customer);
    setSupplier(initVals.supplier || '');
    setSaleType(initVals.saleType || '');
    if (onChange) onChange({ from: initVals.from, to: initVals.to, product: initVals.product, store: initVals.store, customer: initVals.customer, supplier: initVals.supplier || '', saleType: initVals.saleType || '' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {visibility.from && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">From</label>
          <input 
            type="date" 
            value={from} 
            onChange={(e) => setFrom(e.target.value)} 
            className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
          />
        </div>
        )}
        {visibility.to && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">To</label>
          <input 
            type="date" 
            value={to} 
            onChange={(e) => setTo(e.target.value)} 
            className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
          />
        </div>
        )}
        {visibility.product && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Product</label>
          <input 
            value={product} 
            onChange={(e) => setProduct(e.target.value)} 
            className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
            placeholder="Start typing product..."
            list="product-filter-list"
            autoComplete="off"
          />
          <datalist id="product-filter-list">
            {products.map(p => (
              <option key={p._id || p.item} value={p.item}>
                {p.description || p.item}
              </option>
            ))}
          </datalist>
        </div>
        )}
        {visibility.store && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Store</label>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            title="Choose a store or keep All Stores"
          >
            <option value="">All Stores</option>
            {stores.map((s) => (
              <option key={s._id || s.store} value={s.store}>{s.store}</option>
            ))}
          </select>
        </div>
        )}
        {visibility.customer && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Customer</label>
          <input 
            value={customer} 
            onChange={(e) => setCustomer(e.target.value)} 
            className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
            placeholder="Start typing customer..."
            list="customer-filter-list"
            autoComplete="off"
          />
          <datalist id="customer-filter-list">
            {customers.map(c => (
              <option key={c._id || c.code} value={c.person || c.description || c.code} />
            ))}
          </datalist>
        </div>
        )}
        {visibility.supplier && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Supplier</label>
          <input 
            value={supplier} 
            onChange={(e) => setSupplier(e.target.value)} 
            className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
            placeholder="Start typing supplier..."
            list="supplier-filter-list"
            autoComplete="off"
          />
          <datalist id="supplier-filter-list">
            {suppliers.map(s => (
              <option key={s._id || s.code} value={s.person || s.description || s.code} />
            ))}
          </datalist>
        </div>
        )}
        {visibility.saleType && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Type</label>
          <select
            value={saleType}
            onChange={(e) => setSaleType(e.target.value)}
            className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">All</option>
            <option value="Cash">Cash</option>
            <option value="Credit">Credit</option>
            <option value="Code">Code</option>
          </select>
        </div>
        )}
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleApply}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Apply Filter
        </button>
        <button
          onClick={handleClear}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
