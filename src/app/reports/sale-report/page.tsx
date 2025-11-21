"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import { Download, Printer, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FilterType = 'all' | 'today' | 'dateRange';

interface SaleInvoice {
  _id: string;
  invoiceNumber: string;
  date: string;
  customer: string;
  totalAmount: number;
  netAmount: number;
  items: any[];
  totalWeight?: number;
  paymentType?: string;
}

export default function SaleReport() {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoices, setInvoices] = useState<SaleInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New filters
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  // Fetch customers and products
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/customers?status=Active');
        const data = await res.json();
        setCustomers(data.customers || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };

    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = '/api/sale-invoices?';
      
      if (filterType === 'today') {
        const today = new Date().toISOString().split('T')[0];
        url += `from=${today}&to=${today}`;
      } else if (filterType === 'dateRange') {
        if (fromDate) url += `from=${fromDate}&`;
        if (toDate) url += `to=${toDate}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      let filteredInvoices = data.invoices || [];
      
      // Client-side filtering for customer and product
      if (selectedCustomer) {
        filteredInvoices = filteredInvoices.filter((inv: SaleInvoice) => 
          inv.customer === selectedCustomer
        );
      }
      
      if (selectedProduct) {
        filteredInvoices = filteredInvoices.filter((inv: SaleInvoice) => 
          inv.items?.some(item => item.description === selectedProduct || item.product === selectedProduct)
        );
      }
      
      setInvoices(filteredInvoices);
    } catch (error) {
      console.error('Error fetching sale invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filterType, fromDate, toDate, selectedCustomer, selectedProduct]);

  const total = React.useMemo(() => 
    invoices.reduce((sum, inv) => sum + (inv.netAmount || inv.totalAmount || 0), 0), 
    [invoices]
  );

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Invoice No', 'Customer', 'Items', 'Weight (kg)', 'Payment Type', 'Amount'];
    const rows = invoices.map(inv => [
      new Date(inv.date).toLocaleDateString(),
      inv.invoiceNumber,
      inv.customer,
      inv.items?.length || 0,
      (inv.totalWeight || 0).toFixed(2),
      inv.paymentType || 'N/A',
      (inv.netAmount || inv.totalAmount || 0).toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sale-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Sale Report', 14, 20);
    
    doc.setFontSize(10);
    let filterText = 'Filter: ';
    if (filterType === 'all') filterText += 'All Records';
    else if (filterType === 'today') filterText += 'Today';
    else filterText += `${fromDate || 'Start'} to ${toDate || 'End'}`;
    doc.text(filterText, 14, 28);
    
    const tableData = invoices.map(inv => [
      new Date(inv.date).toLocaleDateString(),
      inv.invoiceNumber,
      inv.customer,
      inv.items?.length || 0,
      (inv.totalWeight || 0).toFixed(2),
      inv.paymentType || 'N/A',
      (inv.netAmount || inv.totalAmount || 0).toLocaleString()
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [['Date', 'Invoice No', 'Customer', 'Items', 'Weight (kg)', 'Payment', 'Amount']],
      body: tableData,
      foot: [['', '', '', '', '', 'Total:', total.toLocaleString()]],
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    doc.save(`sale-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sale Report</h1>
            <p className="text-gray-600">View all sale invoices with filters</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={18} />
              CSV
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FileText size={18} />
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer size={18} />
              Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm print:hidden">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Type</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="all"
                    checked={filterType === 'all'}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="mr-2"
                  />
                  <span className="text-sm">All Records</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="today"
                    checked={filterType === 'today'}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="mr-2"
                  />
                  <span className="text-sm">Today</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="dateRange"
                    checked={filterType === 'dateRange'}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="mr-2"
                  />
                  <span className="text-sm">Date Range</span>
                </label>
              </div>
            </div>

            {filterType === 'dateRange' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Additional Filters: Customer and Product */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer.person || customer.description}>
                      {customer.person || customer.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Product</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Products</option>
                  {products.map((product) => (
                    <option key={product._id} value={product.description || product.itemCode}>
                      {product.description || product.itemCode}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20">
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                      {loading ? 'Loading...' : 'No sale invoices found for selected period'}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(inv.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inv.customer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {inv.items?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {(inv.totalWeight || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          inv.paymentType?.toLowerCase() === 'cash' 
                            ? 'bg-green-100 text-green-800' 
                            : inv.paymentType?.toLowerCase() === 'credit'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {inv.paymentType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {(inv.netAmount || inv.totalAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {invoices.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900" colSpan={6}>Total</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                      {total.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Print Summary */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <p>Generated on: {new Date().toLocaleString()}</p>
            <p>Total Records: {invoices.length}</p>
            <p className="font-semibold mt-2">Grand Total: {total.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
