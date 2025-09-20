import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Supplier from '@/models/Supplier';
import PurchaseInvoice from '@/models/PurchaseInvoice';

export async function POST() {
  try {
    await connectDB();

    // Get unique supplier names from existing purchase invoices
    const purchaseSupplierNames = await PurchaseInvoice.distinct('supplier');
    console.log('Found purchase suppliers:', purchaseSupplierNames);

    // Create supplier records for any that don't exist
    const createdSuppliers = [];
    
    for (const supplierName of purchaseSupplierNames) {
      if (!supplierName || supplierName.trim() === '') continue;
      
      // Check if supplier already exists by person or description
      const existingSupplier = await Supplier.findOne({
        $or: [
          { person: supplierName },
          { description: supplierName }
        ]
      });

      if (!existingSupplier) {
        try {
          const newSupplier = new Supplier({
            description: supplierName,
            person: supplierName,
            business: supplierName,
            city: 'Pakistan',
            phone: '0300-0000000',
            address: 'Pakistan',
            email: `${supplierName.replace(/\s+/g, '').toLowerCase()}@example.com`,
            mobile: '0300-0000000',
            isActive: true
          });
          
          await newSupplier.save();
          createdSuppliers.push({
            _id: newSupplier._id,
            description: newSupplier.description,
            person: newSupplier.person,
            code: newSupplier.code
          });
        } catch (error) {
          console.log(`Failed to create supplier ${supplierName}:`, error);
        }
      }
    }

    // Also create some standard suppliers
    const standardSuppliers = [
      'Muhammad Traders',
      'Ali & Sons', 
      'Karachi Wholesale',
      'Punjab Suppliers',
      'Best Quality Co.',
      'Ahmed'
    ];

    for (const supplierName of standardSuppliers) {
      const existingSupplier = await Supplier.findOne({
        $or: [
          { person: supplierName },
          { description: supplierName }
        ]
      });

      if (!existingSupplier) {
        try {
          const newSupplier = new Supplier({
            description: supplierName,
            person: supplierName,
            business: supplierName,
            city: 'Pakistan',
            phone: '0300-0000000',
            address: 'Pakistan',
            email: `${supplierName.replace(/\s+/g, '').toLowerCase()}@example.com`,
            mobile: '0300-0000000',
            isActive: true
          });
          
          await newSupplier.save();
          createdSuppliers.push({
            _id: newSupplier._id,
            description: newSupplier.description,
            person: newSupplier.person,
            code: newSupplier.code
          });
        } catch (error) {
          console.log(`Failed to create supplier ${supplierName}:`, error);
        }
      }
    }

    return NextResponse.json({
      message: 'Suppliers created successfully',
      createdSuppliers,
      purchaseSupplierNames
    });

  } catch (error) {
    console.error('Error creating suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to create suppliers' },
      { status: 500 }
    );
  }
}