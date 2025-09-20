import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import Product from '@/models/Product';
import Customer from '@/models/Customer';

export async function POST() {
  try {
    await connectDB();

    // Check if we already have sample data
    const existingInvoices = await SaleInvoice.countDocuments();
    const existingPurchases = await PurchaseInvoice.countDocuments();
    
    if (existingInvoices > 0 && existingPurchases > 0) {
      return NextResponse.json({ 
        message: 'Sample data already exists',
        saleInvoices: existingInvoices,
        purchaseInvoices: existingPurchases
      });
    }

    // Create sample customers if they don't exist
    const existingCustomers = await Customer.countDocuments();
    if (existingCustomers === 0) {
      await Customer.insertMany([
        {
          name: 'Ahmad Khan',
          email: 'ahmad@example.com',
          phone: '03001234567',
          address: 'Lahore, Pakistan'
        },
        {
          name: 'Muhammad Ali',
          email: 'ali@example.com', 
          phone: '03007654321',
          address: 'Karachi, Pakistan'
        },
        {
          name: 'Fatima Sheikh',
          email: 'fatima@example.com',
          phone: '03009876543',
          address: 'Islamabad, Pakistan'
        }
      ]);
    }

    // Create sample products if they don't exist
    const existingProducts = await Product.countDocuments();
    if (existingProducts === 0) {
      await Product.insertMany([
        {
          name: 'Rice - Basmati',
          price: 150,
          category: 'Grains',
          description: 'Premium Basmati Rice'
        },
        {
          name: 'Wheat Flour',
          price: 80,
          category: 'Flour',
          description: 'Fine Wheat Flour'
        },
        {
          name: 'Cooking Oil',
          price: 300,
          category: 'Oil',
          description: 'Premium Cooking Oil'
        },
        {
          name: 'Sugar',
          price: 120,
          category: 'Sweetener',
          description: 'White Sugar'
        }
      ]);
    }

    // Get customers and products for sample invoices
    const customers = await Customer.find().limit(3);
    const products = await Product.find().limit(4);

    // Create sample sale invoices for the last few months
    const sampleInvoices = [];
    const currentDate = new Date();

    // Create invoices for the last 6 months
    for (let monthBack = 0; monthBack < 6; monthBack++) {
      const invoiceDate = new Date(currentDate);
      invoiceDate.setMonth(invoiceDate.getMonth() - monthBack);
      
      // Create 2-5 invoices per month
      const invoicesThisMonth = Math.floor(Math.random() * 4) + 2;
      
      for (let i = 0; i < invoicesThisMonth; i++) {
        const randomDate = new Date(invoiceDate);
        randomDate.setDate(Math.floor(Math.random() * 28) + 1);
        
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 10) + 1;
        const subtotal = product.price * quantity;
        const tax = subtotal * 0.17; // 17% tax
        const total = subtotal + tax;

        sampleInvoices.push({
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          items: [{
            productName: product.name,
            quantity: quantity,
            price: product.price,
            total: subtotal
          }],
          subtotal: subtotal,
          tax: tax,
          total: total,
          invoiceDate: randomDate
        });
      }
    }

    // Insert sample invoices
    const insertedInvoices = await SaleInvoice.insertMany(sampleInvoices);

    return NextResponse.json({
      message: 'Sample data created successfully',
      invoicesCreated: insertedInvoices.length,
      customersCreated: customers.length,
      productsCreated: products.length
    });

  } catch (error) {
    console.error('Error creating sample data:', error);
    return NextResponse.json(
      { error: 'Failed to create sample data' },
      { status: 500 }
    );
  }
}