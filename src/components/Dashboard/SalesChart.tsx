'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  sales: number;
  orders: number;
}

// Fallback data for when API fails
const FALLBACK_DATA: ChartData[] = [
  { name: 'Jan', sales: 0, orders: 0 },
  { name: 'Feb', sales: 0, orders: 0 },
  { name: 'Mar', sales: 0, orders: 0 },
  { name: 'Apr', sales: 0, orders: 0 },
  { name: 'May', sales: 0, orders: 0 },
  { name: 'Jun', sales: 0, orders: 0 },
  { name: 'Jul', sales: 0, orders: 0 },
  { name: 'Aug', sales: 0, orders: 0 },
  { name: 'Sep', sales: 0, orders: 0 },
  { name: 'Oct', sales: 0, orders: 0 },
  { name: 'Nov', sales: 0, orders: 0 },
  { name: 'Dec', sales: 0, orders: 0 },
];

// Memoized tooltip formatter
const formatTooltipValue = (value: number, name: string) => [
  name === 'sales' ? `PKR ${value.toLocaleString()}` : value,
  name === 'sales' ? 'Sales' : 'Orders'
];

// Memoized tooltip content style
const tooltipContentStyle = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

function SalesChart() {
  const [chartData, setChartData] = useState<ChartData[]>(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/chart-data');
        if (!response.ok) {
          throw new Error('Failed to fetch chart data');
        }
        const data = await response.json();
        setChartData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('Failed to load chart data');
        setChartData(FALLBACK_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  // Memoize chart configuration
  const chartConfig = useMemo(() => ({
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
    salesLineProps: {
      type: 'monotone' as const,
      dataKey: 'sales',
      stroke: '#3b82f6',
      strokeWidth: 3,
      dot: { fill: '#3b82f6', strokeWidth: 2, r: 4 },
      activeDot: { r: 6, stroke: '#3b82f6', strokeWidth: 2 },
    },
    ordersLineProps: {
      type: 'monotone' as const,
      dataKey: 'orders',
      stroke: '#10b981',
      strokeWidth: 3,
      dot: { fill: '#10b981', strokeWidth: 2, r: 4 },
      activeDot: { r: 6, stroke: '#10b981', strokeWidth: 2 },
    },
  }), []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Sales Overview</h3>
        <p className="text-sm text-gray-600">Monthly sales and order trends</p>
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
      
      <div className="h-80">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading chart data...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={chartConfig.margin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `PKR ${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={tooltipContentStyle}
                formatter={formatTooltipValue}
              />
              <Line {...chartConfig.salesLineProps} />
              <Line {...chartConfig.ordersLineProps} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      <div className="flex items-center justify-center space-x-6 mt-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Sales (PKR)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Orders</span>
        </div>
      </div>
    </div>
  );
}

export default memo(SalesChart);
