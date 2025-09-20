import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import SaleInvoice from '@/models/SaleInvoice';
import Supplier from '@/models/Supplier';

export async function GET() {
  try {
    await connectDB();

    console.log('🔍 Starting supplier profit analysis...');

    // Get all purchase invoices grouped by supplier
    const purchaseBySupplier = await PurchaseInvoice.aggregate([
      {
        $match: {
          supplier: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$supplier',
          totalPurchases: { $sum: '$totalAmount' },
          totalPurchaseWeight: { $sum: '$weight' },
          purchaseCount: { $count: {} },
          products: { 
            $addToSet: { 
              $map: { 
                input: '$items', 
                as: 'item', 
                in: '$$item.product' 
              } 
            } 
          }
        }
      }
    ]);

    console.log(`📦 Found ${purchaseBySupplier.length} suppliers with purchases:`, 
      purchaseBySupplier.map(s => ({ supplier: s._id, purchases: s.totalPurchases })));

    // Get all supplier documents for name mapping
    const allSuppliers = await Supplier.find().lean();

    // Flatten products array
    const suppliersWithProducts = purchaseBySupplier.map(supplier => ({
      ...supplier,
      products: supplier.products.flat().filter((product: any) => product && product.trim() !== '')
    }));

    // For each supplier, calculate sales of their products
    const supplierProfitAnalysis = await Promise.all(
      suppliersWithProducts.map(async (supplier) => {
        console.log(`🔍 Analyzing supplier: ${supplier._id} with products:`, supplier.products);
        
        // Get total sales for products from this supplier
        const salesData = await SaleInvoice.aggregate([
          {
            $unwind: '$items'
          },
          {
            $match: {
              'items.product': { $in: supplier.products }
            }
          },
          {
            $group: {
              _id: null,
              totalSales: { $sum: '$items.value' },
              totalSalesWeight: { $sum: '$items.weight' },
              salesCount: { $count: {} }
            }
          }
        ]);

        const sales = salesData[0] || { 
          totalSales: 0, 
          totalSalesWeight: 0, 
          salesCount: 0 
        };

        console.log(`💰 Sales for ${supplier._id}:`, sales);

        const purchases = supplier.totalPurchases || 0;
        const salesAmount = sales.totalSales || 0;
        const profit = salesAmount - purchases;
        const profitMargin = purchases > 0 ? ((profit / purchases) * 100) : 0;

        // Find the supplier document to get contact person name
        const supplierDoc = allSuppliers.find((s: any) => 
          s.person === supplier._id || 
          s.description === supplier._id || 
          s.code === supplier._id
        );

        const displayName = supplierDoc?.person || supplier._id;

        return {
          supplier: displayName, // Show contact person name instead of description
          originalSupplier: supplier._id, // Keep original for debugging
          totalPurchases: purchases,
          totalSales: salesAmount,
          profit: profit,
          profitMargin: profitMargin,
          purchaseCount: supplier.purchaseCount,
          salesCount: sales.salesCount,
          totalPurchaseWeight: supplier.totalPurchaseWeight,
          totalSalesWeight: sales.totalSalesWeight,
          productsCount: supplier.products.length
        };
      })
    );

    // Sort by profit descending
    const sortedAnalysis = supplierProfitAnalysis
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10); // Top 10 suppliers

    console.log('📊 Final supplier profit analysis:', sortedAnalysis);

    return NextResponse.json(sortedAnalysis);
  } catch (error) {
    console.error('❌ Error fetching supplier profit analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier profit analysis' },
      { status: 500 }
    );
  }
}