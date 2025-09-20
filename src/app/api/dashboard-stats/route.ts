import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import User from '@/models/User';

export async function GET() {
  try {
    await connectDB();

    // Get current date and previous month for comparison
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch total revenue (current month and previous month)
    const currentMonthRevenue = await SaleInvoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const previousMonthRevenue = await SaleInvoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: previousMonth, $lte: previousMonthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    // Fetch total orders (sale invoices count)
    const currentMonthOrders = await SaleInvoice.countDocuments({
      invoiceDate: { $gte: currentMonth }
    });

    const previousMonthOrders = await SaleInvoice.countDocuments({
      invoiceDate: { $gte: previousMonth, $lte: previousMonthEnd }
    });

    // Fetch total products
    const totalProducts = await Product.countDocuments();

    // Fetch total customers  
    const totalCustomers = await Customer.countDocuments();

    // Calculate revenue values
    const currentRevenue = currentMonthRevenue[0]?.total || 0;
    const prevRevenue = previousMonthRevenue[0]?.total || 0;
    const revenueChangeNum = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue * 100) : 0;
    const revenueChange = revenueChangeNum.toFixed(1);

    // Calculate orders change
    const ordersChangeNum = previousMonthOrders > 0 ? ((currentMonthOrders - previousMonthOrders) / previousMonthOrders * 100) : 0;
    const ordersChange = ordersChangeNum.toFixed(1);

    // For products and customers, we'll show total counts (since they're cumulative)
    // You could modify this to show growth over time if you track creation dates

    const stats = {
      totalRevenue: {
        value: `PKR ${currentRevenue.toLocaleString()}`,
        change: `${revenueChangeNum >= 0 ? '+' : ''}${revenueChange}%`,
        changeType: revenueChangeNum >= 0 ? 'increase' : 'decrease'
      },
      totalOrders: {
        value: currentMonthOrders.toLocaleString(),
        change: `${ordersChangeNum >= 0 ? '+' : ''}${ordersChange}%`,
        changeType: ordersChangeNum >= 0 ? 'increase' : 'decrease'
      },
      totalProducts: {
        value: totalProducts.toLocaleString(),
        change: 'Total Active',
        changeType: 'neutral'
      },
      totalCustomers: {
        value: totalCustomers.toLocaleString(),
        change: 'Total Registered',
        changeType: 'neutral'
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}