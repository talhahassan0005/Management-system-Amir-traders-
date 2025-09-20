'use client';

import { memo, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Move data outside component to prevent recreation on every render
const CHART_DATA = [
  { name: 'Jan', sales: 4000, orders: 24 },
  { name: 'Feb', sales: 3000, orders: 13 },
  { name: 'Mar', sales: 5000, orders: 20 },
  { name: 'Apr', sales: 4500, orders: 18 },
  { name: 'May', sales: 6000, orders: 28 },
  { name: 'Jun', sales: 5500, orders: 25 },
  { name: 'Jul', sales: 7000, orders: 32 },
];

// Memoized tooltip formatter
const formatTooltipValue = (value: number, name: string) => [
  name === 'sales' ? `$${value}` : value,
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
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={CHART_DATA} margin={chartConfig.margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              contentStyle={tooltipContentStyle}
              formatter={formatTooltipValue}
            />
            <Line {...chartConfig.salesLineProps} />
            <Line {...chartConfig.ordersLineProps} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center space-x-6 mt-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Sales ($)</span>
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
