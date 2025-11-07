import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import SaleInvoice from '@/models/SaleInvoice';

export async function POST() {
  try {
    await connectDB();

    // Sample suppliers with real names
    const suppliers = [
      'Muhammad Traders',
      'Ali & Sons',
      'Karachi Wholesale',
      'Punjab Suppliers',
      'Best Quality Co.'
    ];

    // Sample products
    const products = [
      'Rice - Basmati',
      'Wheat Flour', 
      'Cooking Oil',
      'Sugar',
      'Tea Bags'
    ];

    // Create purchase invoices for last 3 months
    const purchaseInvoices = [];
    const currentDate = new Date();

    for (let monthBack = 0; monthBack < 3; monthBack++) {
      for (let i = 0; i < 3; i++) { // 3 purchases per month
        const invoiceDate = new Date(currentDate);
        invoiceDate.setMonth(invoiceDate.getMonth() - monthBack);
        invoiceDate.setDate(Math.floor(Math.random() * 28) + 1);
        
        const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 50) + 10;
        const weight = quantity * (0.8 + Math.random() * 0.4); // 0.8-1.2 kg per unit
        const rate = 70 + Math.random() * 80; // 70-150 PKR per kg
        const value = rate * weight;

        purchaseInvoices.push({
          supplier: supplier,
          date: invoiceDate,
          reference: `REF-${Date.now()}-${i}`,
          paymentType: Math.random() > 0.5 ? 'Cash' : 'Credit',
          items: [{
            product: product,
            qty: quantity,
            weight: weight,
            rate: rate,
            rateOn: 'Weight',
            value: value,
            brand: 'Standard',
            remarks: `Purchase from ${supplier}`
          }],
          totalAmount: value,
          discount: 0,
          freight: value * 0.02,
          weight: weight
        });
      }
    }

    // Create corresponding sale invoices to test profit calculation
    const saleInvoices = [];
    
    for (let monthBack = 0; monthBack < 3; monthBack++) {
      for (let i = 0; i < 4; i++) { // 4 sales per month
        const invoiceDate = new Date(currentDate);
        invoiceDate.setMonth(invoiceDate.getMonth() - monthBack);
        invoiceDate.setDate(Math.floor(Math.random() * 28) + 1);
        
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 30) + 5;
        const weight = quantity * (0.8 + Math.random() * 0.4);
        const rate = 120 + Math.random() * 100; // 120-220 PKR per kg (higher than purchase)
        const value = rate * weight;

        saleInvoices.push({
          customer: `Customer ${i + 1}`,
          date: invoiceDate,
          reference: `SALE-${Date.now()}-${i}`,
          paymentType: Math.random() > 0.3 ? 'Cash' : 'Credit',
          items: [{
            store: 'Main Store',
            product: product,
            weight: weight,
            rate: rate,
            rateOn: 'Weight',
            value: value,
            description: `Sale of ${product}`,
            brand: 'Standard'
          }],
          totalAmount: value,
          netAmount: value,
          totalWeight: weight
        });
      }
    }

    // Insert the data
    const insertedPurchases = await PurchaseInvoice.insertMany(purchaseInvoices);
    const insertedSales = await SaleInvoice.insertMany(saleInvoices);

    return NextResponse.json({
      message: 'Sample purchase and sale data created successfully',
      purchaseInvoices: insertedPurchases.length,
      saleInvoices: insertedSales.length,
      suppliers: suppliers,
      products: products
    });

  } catch (error: unknown) {
    console.error('Error creating sample data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create sample data', details: message },
      { status: 500 }
    );
  }
}