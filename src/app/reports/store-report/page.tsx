"use client";
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import { Download, Printer, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FilterType = 'all' | 'today' | 'dateRange';
type TransactionType = 'all' | 'in' | 'out' | 'transfer';

interface Production {
  _id: string;
  productionNumber: string;
  date: string;
  outputStoreId: string;
  materialOut: any[];
  items: any[];
  remarks?: string;
}

export default function StoreReport() {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New filter for transaction type
  const [transactionType, setTransactionType] = useState<TransactionType>('all');

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores?status=Active');
      const data = await res.json();
      setStores(data.stores || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchProductions = async () => {
    setLoading(true);
    try {
      let url = '/api/production?limit=1000&';
      
      if (filterType === 'today') {
        const today = new Date().toISOString().split('T')[0];
        url += `from=${today}&to=${today}`;
      } else if (filterType === 'dateRange') {
        if (fromDate) url += `from=${fromDate}&`;
        if (toDate) url += `to=${toDate}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      setProductions(data.productions || []);
    } catch (error) {
      console.error('Error fetching productions:', error);
      setProductions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    fetchProductions();
  }, [filterType, fromDate, toDate]);

  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s._id === storeId);
    return store?.name || storeId;
  };

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Production #', 'Type', 'Store', 'Items', 'Qty (Pkts)', 'Weight (kg)', 'Remarks'];
    const rows: any[] = [];
    
    productions.forEach(prod => {
      // Material OUT entries
      if (prod.materialOut && prod.materialOut.length > 0) {
        prod.materialOut.forEach(item => {
          rows.push([
            new Date(prod.date).toLocaleDateString(),
            prod.productionNumber,
            'OUT',
            getStoreName(item.storeId),
            item.description || '-',
            item.quantityPkts || 0,
            (item.weightKg || 0).toFixed(2),
            item.notes || '-'
          ]);
        });
      }
      
      // Material IN entries (production output)
      if (prod.items && prod.items.length > 0) {
        const totalQty = prod.items.reduce((sum, item) => sum + (item.quantityPkts || 0), 0);
        const totalWeight = prod.items.reduce((sum, item) => sum + (item.weightKg || 0), 0);
        const itemsList = prod.items.map(item => item.description || '-').join(', ');
        
        rows.push([
          new Date(prod.date).toLocaleDateString(),
          prod.productionNumber,
          'IN',
          getStoreName(prod.outputStoreId),
          itemsList,
          totalQty,
          totalWeight.toFixed(2),
          prod.remarks || '-'
        ]);
      }
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map((cell: string | number) => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Store Transaction Report', 14, 20);
    
    doc.setFontSize(10);
    let filterText = 'Filter: ';
    if (filterType === 'all') filterText += 'All Records';
    else if (filterType === 'today') filterText += 'Today';
    else filterText += `${fromDate || 'Start'} to ${toDate || 'End'}`;
    doc.text(filterText, 14, 28);
    
    const tableData: any[] = [];
    productions.forEach(prod => {
      // Material OUT
      if (prod.materialOut && prod.materialOut.length > 0) {
        prod.materialOut.forEach(item => {
          tableData.push([
            new Date(prod.date).toLocaleDateString(),
            prod.productionNumber,
            'OUT',
            getStoreName(item.storeId),
            item.description || '-',
            item.quantityPkts || 0,
            (item.weightKg || 0).toFixed(2)
          ]);
        });
      }
      
      // Material IN
      if (prod.items && prod.items.length > 0) {
        const totalQty = prod.items.reduce((sum, item) => sum + (item.quantityPkts || 0), 0);
        const totalWeight = prod.items.reduce((sum, item) => sum + (item.weightKg || 0), 0);
        const itemsList = prod.items.map(item => item.description || '-').join(', ');
        
        tableData.push([
          new Date(prod.date).toLocaleDateString(),
          prod.productionNumber,
          'IN',
          getStoreName(prod.outputStoreId),
          itemsList,
          totalQty,
          totalWeight.toFixed(2)
        ]);
      }
    });
    
    autoTable(doc, {
      startY: 35,
      head: [['Date', 'Production #', 'Type', 'Store', 'Items', 'Qty', 'Weight (kg)']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        2: { cellWidth: 15 }, // Type column narrower
        5: { halign: 'right' }, // Qty right-aligned
        6: { halign: 'right' }  // Weight right-aligned
      }
    });
    
    doc.save(`store-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Flatten productions into individual transactions
  const transactions = React.useMemo(() => {
    const result: any[] = [];
    
    productions.forEach(prod => {
      // Material OUT entries
      if ((transactionType === 'all' || transactionType === 'out' || transactionType === 'transfer') 
          && prod.materialOut && prod.materialOut.length > 0) {
        prod.materialOut.forEach((item, idx) => {
          result.push({
            id: `${prod._id}-out-${idx}`,
            date: prod.date,
            productionNumber: prod.productionNumber,
            type: 'OUT',
            storeId: item.storeId,
            items: item.description || '-',
            quantity: item.quantityPkts || 0,
            weight: item.weightKg || 0,
            remarks: item.notes || '-'
          });
        });
      }
      
      // Material IN entries
      if ((transactionType === 'all' || transactionType === 'in' || transactionType === 'transfer')
          && prod.items && prod.items.length > 0) {
        const totalQty = prod.items.reduce((sum, item) => sum + (item.quantityPkts || 0), 0);
        const totalWeight = prod.items.reduce((sum, item) => sum + (item.weightKg || 0), 0);
        const itemsList = prod.items.map(item => item.description || '-').join(', ');
        
        result.push({
          id: `${prod._id}-in`,
          date: prod.date,
          productionNumber: prod.productionNumber,
          type: 'IN',
          storeId: prod.outputStoreId,
          items: itemsList,
          quantity: totalQty,
          weight: totalWeight,
          remarks: prod.remarks || '-'
        });
      }
    });
    
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [productions, transactionType]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Store Transaction Report</h1>
            <p className="text-gray-600">View all store movements (IN/OUT) with filters</p>
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

            {/* Transaction Type Filter */}
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="all"
                    checked={transactionType === 'all'}
                    onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                    className="mr-2"
                  />
                  <span className="text-sm">All Transactions</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="in"
                    checked={transactionType === 'in'}
                    onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                    className="mr-2"
                  />
                  <span className="text-sm">Store IN Only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="out"
                    checked={transactionType === 'out'}
                    onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                    className="mr-2"
                  />
                  <span className="text-sm">Store OUT Only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="transfer"
                    checked={transactionType === 'transfer'}
                    onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                    className="mr-2"
                  />
                  <span className="text-sm">Store Transfers</span>
                </label>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Production #</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty (Pkts)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                      {loading ? 'Loading...' : 'No store transactions found for selected period'}
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(txn.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.productionNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          txn.type === 'IN' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getStoreName(txn.storeId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{txn.items}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {txn.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {txn.weight.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{txn.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Print Summary */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <p>Generated on: {new Date().toLocaleString()}</p>
            <p>Total Transactions: {transactions.length}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
