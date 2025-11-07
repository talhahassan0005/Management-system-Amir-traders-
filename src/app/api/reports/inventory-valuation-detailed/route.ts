import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Stock from '@/models/Stock';
import Product from '@/models/Product';
import Store from '@/models/Store';

// Inventory Valuation (Detailed)
// Returns current inventory per product-store-lot with unit cost and total value.
// Filters supported via query: product (item or description, substring), store (name), from, to, customer (ignored).
export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
  const productFilter = (searchParams.get('product') || '').trim();
  const storeFilter = (searchParams.get('store') || '').trim();
  const costMode = ((searchParams.get('cost') || 'latest').toLowerCase() === 'wac') ? 'wac' : 'latest';
  const basis: 'qty' | 'weight' = ((searchParams.get('basis') || 'qty').toLowerCase() === 'weight') ? 'weight' : 'qty';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limitRaw = parseInt(searchParams.get('limit') || '100', 10);
  const limit = Math.min(1000, Math.max(10, isNaN(limitRaw) ? 100 : limitRaw));
    // Date range is accepted for future extension; current valuation is as of now
    // and does not recompute historic balances.

    // Resolve product and store filters to IDs (since Stock keeps ids)
    let productIds: string[] | undefined;
    if (productFilter) {
      const prods = await Product.find({
        $or: [
          { item: new RegExp(productFilter, 'i') },
          { description: new RegExp(productFilter, 'i') },
        ],
      }, { _id: 1 }).lean();
      productIds = prods.map((p: any) => String(p._id));
      if (productIds.length === 0) {
        return NextResponse.json({ rows: [] });
      }
    }

    let storeIds: string[] | undefined;
    if (storeFilter) {
      const stores = await Store.find({ store: new RegExp(`^${storeFilter}$`, 'i') }, { _id: 1 }).lean();
      storeIds = stores.map((s: any) => String(s._id));
      if (storeIds.length === 0) {
        return NextResponse.json({ rows: [] });
      }
    }

    const stockQuery: any = {};
    if (productIds) stockQuery.productId = { $in: productIds };
    if (storeIds) stockQuery.storeId = { $in: storeIds };

    // Instead of using the aggregated Stock snapshot (which merges same product/store),
    // fetch purchase invoice items directly so each purchase entry (reel/lot) is a separate row.
    // This ensures we do NOT merge quantities or weights for identical item codes.
    const PurchaseInvoice = (await import('@/models/PurchaseInvoice')).default;

    // Resolve product/store name lists (PurchaseInvoice stores product/store names, not IDs)
    let productItems: string[] = [];
    let storeNames: string[] = [];
    if (productIds && productIds.length) {
      const prodDocs = await Product.find({ _id: { $in: productIds } }).lean();
      productItems = prodDocs.map((p: any) => p.item).filter(Boolean);
      if (productItems.length === 0) {
        return NextResponse.json({ rows: [], pagination: { page, limit, total: 0, hasMore: false }, totals: { quantity: 0, weight: 0, totalValue: 0 } });
      }
    }
    if (storeIds && storeIds.length) {
      const storeDocs = await Store.find({ _id: { $in: storeIds } }).lean();
      storeNames = storeDocs.map((s: any) => s.store).filter(Boolean);
      if (storeNames.length === 0) {
        return NextResponse.json({ rows: [], pagination: { page, limit, total: 0, hasMore: false }, totals: { quantity: 0, weight: 0, totalValue: 0 } });
      }
    }

  // Date range for purchases (to/from)
  const toParam = (searchParams.get('to') || '').trim();
  const toDate = toParam ? new Date(toParam + 'T23:59:59.999Z') : new Date();

  // Build match for purchases within filters and date range
    const match: any = { 'items.product': { $exists: true } };
    if (productItems.length) match['items.product'] = { $in: productItems };
    if (storeNames.length) match['items.store'] = { $in: storeNames };
    if (toDate) match.date = { $lte: toDate };
    const fromParam = (searchParams.get('from') || '').trim();
    if (fromParam) {
      const fromDate = new Date(fromParam + 'T00:00:00.000Z');
      match.date = match.date ? { ...match.date, $gte: fromDate } : { $gte: fromDate };
    }

    // Unwind purchase items so each item becomes a separate document
    // Get overall matching counts and totals (across all pages)
    const countAgg = await PurchaseInvoice.aggregate([
      { $unwind: '$items' },
      { $match: match },
      { $count: 'total' },
    ]).exec();
    const totalCount = (countAgg && countAgg[0] && countAgg[0].total) ? Number(countAgg[0].total) : 0;

    const totalsAgg = await PurchaseInvoice.aggregate([
      { $unwind: '$items' },
      { $match: match },
      { $project: {
          qty: { $ifNull: ['$items.qty', 0] },
          weight: { $ifNull: ['$items.weight', 0] },
          rate: { $ifNull: ['$items.rate', 0] },
          rateOn: { $ifNull: ['$items.rateOn', 'Weight'] },
          value: { $ifNull: ['$items.value', 0] },
        } },
      { $addFields: {
          _valueNorm: {
            $cond: [
              { $gt: ['$value', 0] },
              '$value',
              {
                $cond: [
                  { $eq: ['$rateOn', 'Quantity'] },
                  { $multiply: ['$rate', '$qty'] },
                  { $multiply: ['$rate', '$weight'] },
                ],
              },
            ],
          },
        } },
      { $group: {
          _id: null,
          totalQty: { $sum: '$qty' },
          totalWeight: { $sum: '$weight' },
          totalValue: { $sum: '$_valueNorm' },
        } },
    ]).exec();

    const grandTotals = totalsAgg && totalsAgg[0] ? { quantity: Number(totalsAgg[0].totalQty || 0), weight: Number(totalsAgg[0].totalWeight || 0), totalValue: Number(totalsAgg[0].totalValue || 0) } : { quantity: 0, weight: 0, totalValue: 0 };

    const purchasesAgg = await PurchaseInvoice.aggregate([
      { $unwind: '$items' },
      { $match: match },
      { $project: {
          supplier: '$supplier',
          date: '$date',
          store: '$items.store',
          product: '$items.product',
          reelNo: { $ifNull: ['$items.reelNo', '-'] },
          qty: { $ifNull: ['$items.qty', 0] },
          weight: { $ifNull: ['$items.weight', 0] },
          rate: { $ifNull: ['$items.rate', 0] },
          rateOn: { $ifNull: ['$items.rateOn', 'Weight'] },
          value: { $ifNull: ['$items.value', 0] },
        } },
      { $sort: { product: 1, store: 1, date: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).exec();

    // If no purchase items found, return empty
    if (!purchasesAgg?.length) {
      return NextResponse.json({ rows: [], pagination: { page, limit, total: 0, hasMore: false }, totals: { quantity: 0, weight: 0, totalValue: 0 } });
    }

    // Map product/store to names and product defaults
    const uniqueProducts = Array.from(new Set(purchasesAgg.map((p: any) => p.product)));
    const prods = await Product.find({ item: { $in: uniqueProducts } }).lean();
    const pByItem = new Map<string, any>(prods.map((p: any) => [String(p.item), p]));
    // Build rows directly from purchase items (each purchase item -> single row)
    const rows = purchasesAgg.map((it: any) => {
      const prod = pByItem.get(it.product) || {};
      const itemName = prod.item || it.product || 'N/A';
      const qty = Number(it.qty || 0);
      const weight = Number(it.weight || 0);

      // Compute unit cost from the purchase record: prefer explicit value, then rate/rateOn
      let unitCost = 0;
      if (it.value && it.value > 0) {
        unitCost = basis === 'weight' && weight > 0 ? (it.value / weight) : (it.value / (qty || 1));
      } else if (it.rate && it.rate > 0) {
        if (String(it.rateOn || 'Weight') === 'Weight') {
          unitCost = basis === 'weight' ? it.rate : (weight > 0 ? it.rate * (weight / (qty || 1)) : 0);
        } else {
          unitCost = basis === 'qty' ? it.rate : (qty > 0 ? it.rate * (qty / (weight || 1)) : 0);
        }
      } else if (prod && prod.costRateQty) {
        const fallbackPerQty = Number(prod.costRateQty || 0);
        if (fallbackPerQty > 0) {
          unitCost = basis === 'weight' && weight > 0 ? fallbackPerQty * (qty / weight) : fallbackPerQty;
        }
      }

      const totalValue = +(((basis === 'weight' ? weight : qty) * unitCost) || 0).toFixed(2);
      return {
        product: itemName,
        store: it.store || 'N/A',
        lot: it.reelNo || '-',
        quantity: qty,
        weight,
        unitCost,
        totalValue,
        supplier: it.supplier || '',
        date: it.date || null,
      };
    });

    // Pagination
  const total = totalCount;
  const start = (page - 1) * limit;
  const paged = rows.slice(start, start + limit);
  const hasMore = page * limit < total;

  // Server-side totals across full query (from aggregation)
  const totals = grandTotals;

  return NextResponse.json({ rows: paged, pagination: { page, limit, total, hasMore }, totals });
  } catch (error: any) {
    console.error('inventory-valuation-detailed failed:', error);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
