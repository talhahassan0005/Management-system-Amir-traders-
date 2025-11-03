import { NextRequest, NextResponse } from 'next/server';
import { emitProductionAdded } from '@/lib/cross-tab-event-bus';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Production from '@/models/Production';
import Product from '@/models/Product';
import Stock from '@/models/Stock';
import Store from '@/models/Store';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import SaleInvoice from '@/models/SaleInvoice';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const q = searchParams.get('q');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: any = {};
    if (q) query.$or = [{ productionNumber: { $regex: q, $options: 'i' } }, { remarks: { $regex: q, $options: 'i' } }];
    if (from || to) {
      query.date = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        query.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.date.$lte = toDate;
      }
    }

    const skip = (page - 1) * limit;
    const data = await Production.find(query).sort({ date: -1 }).skip(skip).limit(limit);
    const total = await Production.countDocuments(query);
    return NextResponse.json({ productions: data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Error fetching productions:', error);
    return NextResponse.json({ error: 'Failed to fetch productions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Validate required fields
    if (!body.date) body.date = new Date();
    if (typeof body.date === 'string') body.date = new Date(body.date);
    if (!body.outputStoreId) {
      return NextResponse.json({ error: 'Output store is required' }, { status: 400 });
    }

    // Validate output store exists
    const outputStore = await Store.findById(body.outputStoreId);
    if (!outputStore) {
      return NextResponse.json({ error: 'Output store not found' }, { status: 404 });
    }

    // Process material out items
    if (!Array.isArray(body.materialOut)) body.materialOut = [];
    body.materialOut = body.materialOut.map((it: any) => ({
      ...it,
      quantityPkts: Number(it.quantityPkts || 0),
      weightKg: Number(it.weightKg || 0),
    }));

    // Process production items
    if (!Array.isArray(body.items)) body.items = [];
    body.items = body.items.map((it: any) => ({
      ...it,
      quantityPkts: Number(it.quantityPkts || 0),
      weightKg: Number(it.weightKg || 0),
    }));

    // Validate all products exist
    const allProductIds = [
      ...(body.materialOut || []).map((it: any) => String(it.productId)),
      ...(body.items || []).map((it: any) => String(it.productId))
    ].filter(Boolean);
    
    if (allProductIds.length > 0) {
      const uniqueProductIds = Array.from(new Set(allProductIds));
      const exists = await Product.countDocuments({ _id: { $in: uniqueProductIds } });
      if (exists !== uniqueProductIds.length) {
        return NextResponse.json({ error: 'One or more products do not exist' }, { status: 400 });
      }
    }

    // Helper: aggregate available quantity by store name and product item
    const aggregateAvailableQty = async (storeName: string, productItem: string): Promise<number> => {
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
      return purchased - sold;
    };

    // Validate material out stores exist and check stock availability
    for (const material of body.materialOut || []) {
      const store = await Store.findById(material.storeId);
      if (!store) {
        return NextResponse.json({ error: `Store not found for material: ${material.productId}` }, { status: 404 });
      }

      // Check stock availability in Stock collection first
      const stock = await Stock.findOne({ 
        productId: material.productId, 
        storeId: material.storeId 
      });

      let availablePkts = Number(stock?.quantityPkts || 0);
      if (!stock) {
        // Fallback: compute from purchases - sales by store/product names
        const product = await Product.findById(material.productId).lean();
        const productItem = (product as any)?.item || '';
        const storeName = (store as any)?.store || '';
        if (productItem && storeName) {
          availablePkts = await aggregateAvailableQty(storeName, productItem);
        }
      }

      if (availablePkts < Number(material.quantityPkts || 0)) {
        return NextResponse.json({ 
          error: `Insufficient stock for product ${material.productId} in store ${store.store}` 
        }, { status: 400 });
      }
    }

    // Generate production number if not provided
    if (!body.productionNumber || String(body.productionNumber).trim().length === 0) {
      const count = await Production.countDocuments();
      body.productionNumber = `PR-${String(count + 1).padStart(6, '0')}`;
    }

    // Create production record
    const created = await Production.create(body);

    // Update stock: reduce material out, add products in
    for (const material of body.materialOut || []) {
      const stock = await Stock.findOne({ 
        productId: material.productId, 
        storeId: material.storeId 
      });
      if (stock) {
        stock.quantityPkts = Math.max(0, Number(stock.quantityPkts || 0) - Number(material.quantityPkts || 0));
        stock.weightKg = Math.max(0, Number(stock.weightKg || 0) - Number(material.weightKg || 0));
        await stock.save();
      } else {
        // Create a stock doc representing post-consumption balance using aggregated availability
        const storeDoc = await Store.findById(material.storeId).lean();
        const productDoc = await Product.findById(material.productId).lean();
        const storeName = (storeDoc as any)?.store || '';
        const productItem = (productDoc as any)?.item || '';
        let availablePkts = 0;
        if (storeName && productItem) {
          availablePkts = await aggregateAvailableQty(storeName, productItem);
        }
        const newQty = Math.max(0, availablePkts - Number(material.quantityPkts || 0));
        await Stock.create({
          productId: String(material.productId),
          storeId: String(material.storeId),
          quantityPkts: newQty,
          weightKg: Math.max(0, Number(material.weightKg || 0)), // weight fallback; adjust if needed
          reelNo: material.reelNo,
          notes: material.notes,
        });
      }
    }

    for (const item of body.items || []) {
      const existingStock = await Stock.findOne({ 
        productId: item.productId, 
        storeId: body.outputStoreId 
      });
      
      if (existingStock) {
        existingStock.quantityPkts += item.quantityPkts;
        existingStock.weightKg += item.weightKg;
        await existingStock.save();
      } else {
        await Stock.create({
          productId: item.productId,
          storeId: body.outputStoreId,
          quantityPkts: item.quantityPkts,
          weightKg: item.weightKg,
          reelNo: item.reelNo,
          notes: item.notes
        });
      }
    }

    emitProductionAdded();
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating production:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: msgs.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Duplicate production number' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create production' }, { status: 500 });
  }
}
