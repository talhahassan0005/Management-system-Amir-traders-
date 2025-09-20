import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Stock from '@/models/Stock';
import Product from '@/models/Product';
import Store from '@/models/Store';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import SaleInvoice from '@/models/SaleInvoice';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const query: any = {};
    if (storeId) query.storeId = storeId;
    if (productId) query.productId = productId;

    const stocks = await Stock.find(query)
      .populate('productId', 'item description')
      .populate('storeId', 'store description')
      .limit(limit)
      .sort({ createdAt: -1 });

    // If a specific product+store was requested but no stock doc exists,
    // fall back to aggregated quantity from purchases - sales by names
    if ((!stocks || stocks.length === 0) && storeId && productId) {
      const [store, product] = await Promise.all([
        Store.findById(storeId).lean(),
        Product.findById(productId).lean(),
      ]);
      const storeName = (store as any)?.store || '';
      const productItem = (product as any)?.item || '';
      if (storeName && productItem) {
        const [purchasesAgg] = await PurchaseInvoice.aggregate([
          { $unwind: '$items' },
          { $match: { 'items.store': storeName, 'items.product': productItem } },
          { $group: { _id: null, qty: { $sum: { $ifNull: ['$items.qty', 0] } } } },
        ]).exec();
        const [salesAgg] = await SaleInvoice.aggregate([
          { $unwind: '$items' },
          { $match: { 'items.store': storeName, 'items.product': productItem } },
          { $group: { _id: null, qty: { $sum: { $ifNull: ['$items.pkt', 0] } } } },
        ]).exec();
        const purchased = Number(purchasesAgg?.qty || 0);
        const sold = Number(salesAgg?.qty || 0);
        const currentQty = Math.max(0, purchased - sold);
        return NextResponse.json({ stocks: [{ productId, storeId, quantityPkts: currentQty, weightKg: 0 }] });
      }
    }

    return NextResponse.json({ stocks });
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Validate required fields
    if (!body.productId || !body.storeId) {
      return NextResponse.json({ error: 'Product ID and Store ID are required' }, { status: 400 });
    }

    // Validate product exists
    const product = await Product.findById(body.productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Validate store exists
    const store = await Store.findById(body.storeId);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Check if stock already exists for this product-store combination
    const existingStock = await Stock.findOne({ 
      productId: body.productId, 
      storeId: body.storeId 
    });

    if (existingStock) {
      // Update existing stock
      existingStock.quantityPkts += Number(body.quantityPkts || 0);
      existingStock.weightKg += Number(body.weightKg || 0);
      if (body.reelNo) existingStock.reelNo = body.reelNo;
      if (body.notes) existingStock.notes = body.notes;
      
      await existingStock.save();
      return NextResponse.json(existingStock);
    } else {
      // Create new stock entry
      const stock = await Stock.create({
        productId: body.productId,
        storeId: body.storeId,
        quantityPkts: Number(body.quantityPkts || 0),
        weightKg: Number(body.weightKg || 0),
        reelNo: body.reelNo,
        notes: body.notes
      });
      return NextResponse.json(stock, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error creating/updating stock:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: msgs.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create/update stock' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    if (!body.productId || !body.storeId) {
      return NextResponse.json({ error: 'Product ID and Store ID are required' }, { status: 400 });
    }

    const stock = await Stock.findOne({ 
      productId: body.productId, 
      storeId: body.storeId 
    });

    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    // Update stock quantities
    stock.quantityPkts = Number(body.quantityPkts || 0);
    stock.weightKg = Number(body.weightKg || 0);
    if (body.reelNo !== undefined) stock.reelNo = body.reelNo;
    if (body.notes !== undefined) stock.notes = body.notes;

    await stock.save();
    return NextResponse.json(stock);
  } catch (error: any) {
    console.error('Error updating stock:', error);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}