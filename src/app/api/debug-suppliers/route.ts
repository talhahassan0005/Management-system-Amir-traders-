import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Supplier from '@/models/Supplier';
import PurchaseInvoice from '@/models/PurchaseInvoice';

export async function GET() {
  try {
    await connectDB();

    // Get all suppliers
    const suppliers = await Supplier.find().lean();
    
    // Get all unique supplier names from purchase invoices
    const purchaseSuppliers = await PurchaseInvoice.distinct('supplier');

    // Get some sample purchase invoices
    const samplePurchases = await PurchaseInvoice.find().limit(5).lean();

    return NextResponse.json({
      suppliers: suppliers.map(s => ({
        _id: s._id,
        code: (s as any).code,
        description: (s as any).description,
        person: (s as any).person
      })),
      purchaseSupplierNames: purchaseSuppliers,
      samplePurchases: samplePurchases.map(p => ({
        invoiceNumber: (p as any).invoiceNumber,
        supplier: (p as any).supplier,
        totalAmount: (p as any).totalAmount
      }))
    });
  } catch (error) {
    console.error('Error fetching supplier debug data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier debug data' },
      { status: 500 }
    );
  }
}