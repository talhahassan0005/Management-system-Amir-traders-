import Layout from '@/components/Layout/Layout';
import StatsCard from '@/components/Dashboard/StatsCard';
import SalesChart from '@/components/Dashboard/SalesChart';
import RecentOrders from '@/components/Dashboard/RecentOrders';
import { Users, Package, ShoppingCart, DollarSign } from 'lucide-react';

export default function Home() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Amir Traders Dashboard</h1>
          <p className="text-blue-100 text-lg">Welcome back! Here's what's happening with your business today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Revenue"
            value="PKR 45,231"
            change="+20.1%"
            changeType="increase"
            icon={DollarSign}
            color="bg-green-500"
          />
          <StatsCard
            title="Total Orders"
            value="2,350"
            change="+15.3%"
            changeType="increase"
            icon={ShoppingCart}
            color="bg-blue-500"
          />
          <StatsCard
            title="Total Products"
            value="1,234"
            change="+5.2%"
            changeType="increase"
            icon={Package}
            color="bg-purple-500"
          />
          <StatsCard
            title="Total Users"
            value="2,573"
            change="+12.5%"
            changeType="increase"
            icon={Users}
            color="bg-orange-500"
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesChart />
          <RecentOrders />
        </div>
      </div>
    </Layout>
  );
}