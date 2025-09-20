import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';

export async function GET() {
  try {
    await connectDB();

    // Get the last 12 months of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1); // Start from first day of the month

    // Get monthly sales data
    const monthlyData = await SaleInvoice.aggregate([
      {
        $match: {
          invoiceDate: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' }
          },
          sales: { $sum: '$total' },
          orders: { $count: {} }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      }
    ]);

    // Create array for last 12 months with proper month names
    const months = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 12; i++) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const monthName = currentDate.toLocaleString('default', { month: 'short' });
      
      // Find data for this month
      const monthData = monthlyData.find(
        (data) => data._id.year === year && data._id.month === month
      );
      
      months.push({
        name: monthName,
        sales: monthData?.sales || 0,
        orders: monthData?.orders || 0
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return NextResponse.json(months);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}