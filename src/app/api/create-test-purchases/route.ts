import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PurchaseInvoice from '@/models/PurchaseInvoice';

export async function POST() {
  try {
    await connectDB();

    // Create a purchase invoice for Ahmed supplier
    const ahmedPurchase = new PurchaseInvoice({
      supplier: 'Ahmed',
      date: new Date('2025-09-15'),
      reference: 'PO-001',
      paymentType: 'Credit',
      items: [{
        store: 'Main Store',
        product: 'Rice - Basmati',
        qty: 100,
        weight: 100,
        rate: 150,
        rateOn: 'Weight',
        value: 15000,
        brand: 'Premium',
        remarks: 'Purchase from Ahmed supplier'
      }],
      totalAmount: 15000,
      discount: 0,
      freight: 300,
      weight: 100
    });

    await ahmedPurchase.save();

    // Create another purchase invoice for existing supplier
    const existingSupplierPurchase = new PurchaseInvoice({
      supplier: 'Unde est eaque ipsam',
      date: new Date('2025-09-10'),
      reference: 'PO-002', 
      paymentType: 'Credit',
      items: [{
        store: 'Main Store',
        product: 'Wheat Flour',
        qty: 50,
        weight: 50,
        rate: 80,
        rateOn: 'Weight',
        value: 4000,
        brand: 'Standard',
        remarks: 'Additional purchase'
      }],
      totalAmount: 4000,
      discount: 0,
      freight: 100,
      weight: 50
    });

    await existingSupplierPurchase.save();

    return NextResponse.json({
      message: 'Purchase invoices created successfully',
      invoices: [
        {
          invoiceNumber: ahmedPurchase.invoiceNumber,
          supplier: ahmedPurchase.supplier,
          totalAmount: ahmedPurchase.totalAmount
        },
        {
          invoiceNumber: existingSupplierPurchase.invoiceNumber,
          supplier: existingSupplierPurchase.supplier,
          totalAmount: existingSupplierPurchase.totalAmount
        }
      ]
    });

  } catch (error) {
    console.error('Error creating purchase invoices:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase invoices' },
      { status: 500 }
    );
  }
}