'use client';

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

interface SaleInvoice {
  _id: string;
  invoiceNumber: string;
  customer: string;
  date: string;
  items: any[];
  totalAmount: number;
  netAmount: number;
  totalWeight: number;
}

interface SaleInvoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInvoice: (invoice: SaleInvoice) => void;
}

type TabType = 'customer' | 'product' | 'dateNo' | 'saleNo' | 'dateRange' | 'all';

export default function SaleInvoiceSearchModal({ isOpen, onClose, onSelectInvoice }: SaleInvoiceSearchModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [results, setResults] = useState<SaleInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Fetch customers and products for dropdowns
      fetchCustomers();
      fetchProducts();
      // Load all invoices by default
      handleSearch();
      // Reset on open
      setSearchQuery('');
      setFromDate('');
      setToDate('');
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers?limit=1000');
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=1000');
      const data = await res.json();
      // Products API returns { products: [...] } format
      const productList = data.products || [];
      setProducts(productList);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  // Auto-search when searchQuery changes (for dropdowns) or dates change
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setTimeout(() => {
      if (activeTab === 'customer' || activeTab === 'product') {
        if (searchQuery) {
          handleSearch();
        }
      } else if (activeTab === 'dateRange') {
        if (fromDate || toDate) {
          handleSearch();
        }
      } else if (activeTab === 'dateNo' || activeTab === 'saleNo') {
        if (searchQuery) {
          handleSearch();
        }
      } else if (activeTab === 'all') {
        handleSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fromDate, toDate, activeTab, isOpen]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Fetch all invoices (or use search param for initial filtering)
      let url = '/api/sale-invoices?limit=500';
      
      // For date range, add filter
      if (activeTab === 'dateRange' && (fromDate || toDate)) {
        const filters: any = {};
        if (fromDate) filters.fromDate = fromDate;
        if (toDate) filters.toDate = toDate;
        url += `&filter=${encodeURIComponent(JSON.stringify(filters))}`;
      } else if (activeTab !== 'all' && searchQuery) {
        // Use search param for initial filtering
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      let invoices = data.invoices || [];

      // Client-side filtering based on active tab
      if (activeTab === 'customer' && searchQuery) {
        invoices = invoices.filter((inv: SaleInvoice) => 
          inv.customer?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else if (activeTab === 'product' && searchQuery) {
        invoices = invoices.filter((inv: SaleInvoice) => 
          inv.items?.some((item: any) => 
            item.product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
      } else if (activeTab === 'dateNo' && searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        invoices = invoices.filter((inv: SaleInvoice) => 
          inv.invoiceNumber?.toLowerCase().includes(queryLower) ||
          inv.date?.toString().includes(searchQuery)
        );
      } else if (activeTab === 'saleNo' && searchQuery) {
        invoices = invoices.filter((inv: SaleInvoice) => 
          inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      // For 'dateRange' and 'all', use invoices as-is (already filtered by API)

      setResults(invoices);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInvoice = (invoice: SaleInvoice) => {
    onSelectInvoice(invoice);
    onClose();
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setResults([]);
    // Auto-load for 'all' tab
    if (tab === 'all') {
      setTimeout(() => handleSearch(), 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-xl font-semibold text-white">Search Sale Invoices</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded-full p-1 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => handleTabChange('customer')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'customer'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Customer
          </button>
          <button
            onClick={() => handleTabChange('product')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'product'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Product
          </button>
          <button
            onClick={() => handleTabChange('dateNo')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'dateNo'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Date/No
          </button>
          <button
            onClick={() => handleTabChange('saleNo')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'saleNo'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Sale #
          </button>
          <button
            onClick={() => handleTabChange('dateRange')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'dateRange'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            From-To Date
          </button>
          <button
            onClick={() => handleTabChange('all')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            All
          </button>
        </div>

        {/* Search Input Area */}
        <div className="p-4 bg-white border-b border-gray-200">
          {activeTab === 'customer' && (
            <div>
              <select
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer.person || customer.description}>
                    {customer.person ? `${customer.person} (${customer.description})` : customer.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'product' && (
            <div>
              <select
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Product</option>
                {products.map((product) => (
                  <option key={product._id} value={product.item}>
                    {product.item} - {product.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'dateNo' && (
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Date (YYYY-MM-DD) or Invoice Number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {activeTab === 'saleNo' && (
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Sale Invoice Number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {activeTab === 'dateRange' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'all' && (
            <div className="text-center text-sm text-gray-600">
              Showing all recent invoices
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search size={48} className="mx-auto mb-2 text-gray-400" />
              <p>No invoices found. Try a different search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Weight</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Net Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {invoice.customer}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {invoice.items?.length || 0} items
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {invoice.totalWeight ? `${invoice.totalWeight.toFixed(2)} kg` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        PKR {invoice.netAmount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleSelectInvoice(invoice)}
                          className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 transition-colors"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {results.length > 0 && `Found ${results.length} invoice${results.length !== 1 ? 's' : ''}`}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
