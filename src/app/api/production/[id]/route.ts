import { NextRequest, NextResponse } from 'next/server';
import { emitProductionDeleted, emitProductionUpdated } from '@/lib/cross-tab-event-bus';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Production from '@/models/Production';
import Product from '@/models/Product';
import Store from '@/models/Store';
import Stock from '@/models/Stock';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import SaleInvoice from '@/models/SaleInvoice';

// Local lightweight type for lean() result to avoid union/array inference issues
type PrevProduction = {
  materialOut?: Array<{
    productId: string;
    storeId: string;
    quantityPkts?: number;
    weightKg?: number;
    reelNo?: string;
    notes?: string;
  }>;
  items?: Array<{
    productId: string;
    quantityPkts?: number;
    weightKg?: number;
    reelNo?: string;
    notes?: string;
  }>;
  outputStoreId?: string;
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const doc = await Production.findById(id);
    if (!doc) return NextResponse.json({ error: 'Production not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    console.error('Error fetching production:', error);
    return NextResponse.json({ error: 'Failed to fetch production' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const body = await request.json();
    if (typeof body.date === 'string') body.date = new Date(body.date);

    // Normalize arrays
    if (!Array.isArray(body.materialOut)) body.materialOut = [];
    if (!Array.isArray(body.items)) body.items = [];
    body.materialOut = body.materialOut.map((it: any) => ({
      ...it,
      quantityPkts: Number(it.quantityPkts || 0),
      weightKg: Number(it.weightKg || 0),
    }));
    body.items = body.items.map((it: any) => ({
      ...it,
      quantityPkts: Number(it.quantityPkts || 0),
      weightKg: Number(it.weightKg || 0),
    }));

    // Validate products exist (both materialOut and items)
    const allProductIds = [
      ...body.materialOut.map((it: any) => String(it.productId)),
      ...body.items.map((it: any) => String(it.productId)),
    ].filter(Boolean);
    if (allProductIds.length > 0) {
      const unique = Array.from(new Set(allProductIds));
      const exists = await Product.countDocuments({ _id: { $in: unique } });
      if (exists !== unique.length) {
        return NextResponse.json({ error: 'One or more products do not exist' }, { status: 400 });
      }
    }

    // Load previous production
  const { id } = await ctx.params;
  const prev = (await Production.findById(id).lean()) as PrevProduction | null;
  if (!prev) return NextResponse.json({ error: 'Production not found' }, { status: 404 });

    // Helper for aggregate availability when Stock doc is missing
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

    // 1) Revert previous stock effects
    // Add back materialOut to their stores
    for (const m of (prev.materialOut || [])) {
      const st = await Stock.findOne({ productId: m.productId, storeId: m.storeId });
      if (st) {
        st.quantityPkts = Number(st.quantityPkts || 0) + Number(m.quantityPkts || 0);
        st.weightKg = Number(st.weightKg || 0) + Number(m.weightKg || 0);
        await st.save();
      } else {
        await Stock.create({
          productId: String(m.productId),
          storeId: String(m.storeId),
          quantityPkts: Number(m.quantityPkts || 0),
          weightKg: Number(m.weightKg || 0),
          reelNo: m.reelNo,
          notes: m.notes,
        });
      }
    }
    // Remove previously added items from previous output store
    for (const it of (prev.items || [])) {
      const st = await Stock.findOne({ productId: it.productId, storeId: prev.outputStoreId });
      if (st) {
        st.quantityPkts = Math.max(0, Number(st.quantityPkts || 0) - Number(it.quantityPkts || 0));
        st.weightKg = Math.max(0, Number(st.weightKg || 0) - Number(it.weightKg || 0));
        await st.save();
      } else {
        // If no stock doc, create zeroed doc to keep consistency
        await Stock.create({
          productId: String(it.productId),
          storeId: String(prev.outputStoreId),
          quantityPkts: 0,
          weightKg: 0,
        });
      }
    }

    // 2) Validate new materialOut availability (use fallback when needed)
    for (const material of body.materialOut || []) {
      const store = await Store.findById(material.storeId);
      if (!store) return NextResponse.json({ error: 'Store not found for material' }, { status: 404 });
      const stock = await Stock.findOne({ productId: material.productId, storeId: material.storeId });
      let availablePkts = Number(stock?.quantityPkts || 0);
      if (!stock) {
        const product = await Product.findById(material.productId).lean();
        const productItem = (product as any)?.item || '';
        const storeName = (store as any)?.store || '';
        if (productItem && storeName) availablePkts = await aggregateAvailableQty(storeName, productItem);
      }
      if (availablePkts < Number(material.quantityPkts || 0)) {
        return NextResponse.json({ error: `Insufficient stock for product ${material.productId} in store ${store.store}` }, { status: 400 });
      }
    }

    // 3) Apply new stock effects
    for (const material of body.materialOut || []) {
      const st = await Stock.findOne({ productId: material.productId, storeId: material.storeId });
      if (st) {
        st.quantityPkts = Math.max(0, Number(st.quantityPkts || 0) - Number(material.quantityPkts || 0));
        st.weightKg = Math.max(0, Number(st.weightKg || 0) - Number(material.weightKg || 0));
        await st.save();
      } else {
        // Create based on aggregate fallback minus consumption
        const storeDoc = await Store.findById(material.storeId).lean();
        const productDoc = await Product.findById(material.productId).lean();
        const storeName = (storeDoc as any)?.store || '';
        const productItem = (productDoc as any)?.item || '';
        let availablePkts = 0;
        if (storeName && productItem) availablePkts = await aggregateAvailableQty(storeName, productItem);
        await Stock.create({
          productId: String(material.productId),
          storeId: String(material.storeId),
          quantityPkts: Math.max(0, availablePkts - Number(material.quantityPkts || 0)),
          weightKg: Math.max(0, Number(material.weightKg || 0)),
          reelNo: material.reelNo,
          notes: material.notes,
        });
      }
    }
    for (const it of body.items || []) {
      const st = await Stock.findOne({ productId: it.productId, storeId: body.outputStoreId });
      if (st) {
        st.quantityPkts = Number(st.quantityPkts || 0) + Number(it.quantityPkts || 0);
        st.weightKg = Number(st.weightKg || 0) + Number(it.weightKg || 0);
        await st.save();
      } else {
        await Stock.create({
          productId: String(it.productId),
          storeId: String(body.outputStoreId),
          quantityPkts: Number(it.quantityPkts || 0),
          weightKg: Number(it.weightKg || 0),
          reelNo: it.reelNo,
          notes: it.notes,
        });
      }
    }

    // 4) Finally update the production document
    const updated = await Production.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Production not found after update' }, { status: 404 });

    emitProductionUpdated();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating production:', error);
    return NextResponse.json({ error: 'Failed to update production' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const deleted = await Production.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Production not found' }, { status: 404 });

    emitProductionDeleted();
    return NextResponse.json({ message: 'Production deleted successfully' });
  } catch (error) {
    console.error('Error deleting production:', error);
    return NextResponse.json({ error: 'Failed to delete production' }, { status: 500 });
  }
}
