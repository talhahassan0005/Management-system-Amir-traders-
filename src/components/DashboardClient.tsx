"use client";

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import StatsCard from '@/components/Dashboard/StatsCard';
import SalesChart from '@/components/Dashboard/SalesChart';
import RecentOrders from '@/components/Dashboard/RecentOrders';
import SupplierProfitTable from '@/components/Dashboard/SupplierProfitTable';
import { Users, Package, ShoppingCart, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalRevenue: {
    value: string;
    change: string;
    changeType: 'increase' | 'decrease' | 'neutral';
  };
  totalOrders: {
    value: string;
    change: string;
    changeType: 'increase' | 'decrease' | 'neutral';
  };
  totalProducts: {
    value: string;
    change: string;
    changeType: 'increase' | 'decrease' | 'neutral';
  };
  totalCustomers: {
    value: string;
    change: string;
    changeType: 'increase' | 'decrease' | 'neutral';
  };
}

export default function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard-stats');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard stats');
        // Fallback to default values
        setStats({
          totalRevenue: {
            value: 'PKR 0',
            change: '0%',
            changeType: 'neutral'
          },
          totalOrders: {
            value: '0',
            change: '0%',
            changeType: 'neutral'
          },
          totalProducts: {
            value: '0',
            change: 'Total Active',
            changeType: 'neutral'
          },
          totalCustomers: {
            value: '0',
            change: 'Total Registered',
            changeType: 'neutral'
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Amir Traders Dashboard</h1>
          <p className="text-blue-100 text-lg">Welcome back! Here's what's happening with your business today.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            // Loading skeletons
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </>
          ) : stats ? (
            <>
              <StatsCard
                title="Total Revenue"
                value={stats.totalRevenue.value}
                change={stats.totalRevenue.change}
                changeType={stats.totalRevenue.changeType}
                icon={DollarSign}
                color="bg-green-500"
              />
              <StatsCard
                title="Total Orders"
                value={stats.totalOrders.value}
                change={stats.totalOrders.change}
                changeType={stats.totalOrders.changeType}
                icon={ShoppingCart}
                color="bg-blue-500"
              />
              <StatsCard
                title="Total Products"
                value={stats.totalProducts.value}
                change={stats.totalProducts.change}
                changeType={stats.totalProducts.changeType}
                icon={Package}
                color="bg-purple-500"
              />
              <StatsCard
                title="Total Customers"
                value={stats.totalCustomers.value}
                change={stats.totalCustomers.change}
                changeType={stats.totalCustomers.changeType}
                icon={Users}
                color="bg-orange-500"
              />
            </>
          ) : null}
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesChart />
          <RecentOrders />
        </div>

        {/* Supplier Profit Analysis */}
        <div className="mt-6">
          <SupplierProfitTable />
        </div>
      </div>
    </Layout>
  );
}
