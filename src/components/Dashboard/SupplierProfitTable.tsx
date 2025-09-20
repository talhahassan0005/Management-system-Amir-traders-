'use client';

import { useState, useEffect, memo } from 'react';
import { TrendingUp, TrendingDown, Package, ShoppingCart } from 'lucide-react';

interface SupplierProfitData {
  supplier: string;
  totalPurchases: number;
  totalSales: number;
  profit: number;
  profitMargin: number;
  purchaseCount: number;
  salesCount: number;
  totalPurchaseWeight: number;
  totalSalesWeight: number;
  productsCount: number;
}

function SupplierProfitTable() {
  const [data, setData] = useState<SupplierProfitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupplierProfitData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/supplier-profit');
        if (!response.ok) {
          throw new Error('Failed to fetch supplier profit data');
        }
        const profitData = await response.json();
        setData(profitData);
        setError(null);
      } catch (err) {
        console.error('Error fetching supplier profit data:', err);
        setError('Failed to load supplier profit data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierProfitData();
  }, []);

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600';
    if (profit < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getProfitIcon = (profit: number) => {
    if (profit > 0) return <TrendingUp className="w-4 h-4" />;
    if (profit < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Supplier Profit Analysis</h3>
          <p className="text-sm text-gray-600">Purchase vs Sale profitability by supplier</p>
        </div>
        <div className="animate-pulse">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Supplier Profit Analysis</h3>
          <p className="text-sm text-gray-600">Purchase vs Sale profitability by supplier</p>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-2">Make sure you have purchase and sale invoices in the system</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Supplier Profit Analysis</h3>
          <p className="text-sm text-gray-600">Purchase vs Sale profitability by supplier</p>
        </div>
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No supplier data available</p>
          <p className="text-gray-400 text-xs mt-1">Add purchase and sale invoices to see profit analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Supplier Profit Analysis</h3>
        <p className="text-sm text-gray-600">Purchase vs Sale profitability by supplier</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchases
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sales
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Margin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((supplier, index) => (
              <tr key={supplier.supplier} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {supplier.supplier.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {supplier.supplier}
                      </div>
                      <div className="text-xs text-gray-500">
                        {supplier.productsCount} products
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(supplier.totalPurchases)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {supplier.purchaseCount} invoices
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(supplier.totalSales)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {supplier.salesCount} sales
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium flex items-center ${getProfitColor(supplier.profit)}`}>
                    {getProfitIcon(supplier.profit)}
                    <span className="ml-1">{formatCurrency(supplier.profit)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${getProfitColor(supplier.profit)}`}>
                    {formatPercentage(supplier.profitMargin)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      <span>{supplier.purchaseCount}P</span>
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <span>{supplier.salesCount}S</span>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing top {data.length} suppliers by profit
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              <span>Profitable</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              <span>Loss</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(SupplierProfitTable);