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

    // Pull stock documents (current snapshot)
  const stocks = await Stock.find(stockQuery).lean();

    if (!stocks?.length) {
      return NextResponse.json({ rows: [] });
    }

    // Fetch products and stores referenced
    const pIds = Array.from(new Set(stocks.map((s: any) => String(s.productId))));
    const sIds = Array.from(new Set(stocks.map((s: any) => String(s.storeId))));
    const [products, stores] = await Promise.all([
      Product.find({ _id: { $in: pIds } }).lean(),
      Store.find({ _id: { $in: sIds } }).lean(),
    ]);
    const pById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));
    const sById = new Map<string, any>(stores.map((s: any) => [String(s._id), s]));

    // Prepare latest purchase info per product/store/lot up to 'to' date (if provided)
  const toParam = (searchParams.get('to') || '').trim();
    const toDate = toParam ? new Date(toParam + 'T23:59:59.999Z') : new Date();
    const storeNames = sIds.map((id) => (sById.get(id)?.store || '')).filter(Boolean);
    const productItems = pIds.map((id) => (pById.get(id)?.item || '')).filter(Boolean);

    type Key = string;
    const latestByKey = new Map<Key, any>();
    if (storeNames.length && productItems.length) {
      const PurchaseInvoice = (await import('@/models/PurchaseInvoice')).default;

      if (costMode === 'latest') {
        const agg = await PurchaseInvoice.aggregate([
          { $unwind: '$items' },
          { $match: {
              date: { $lte: toDate },
              'items.store': { $in: storeNames },
              'items.product': { $in: productItems },
            } },
          { $sort: { date: -1, _id: -1 } },
          { $group: {
              _id: { store: '$items.store', product: '$items.product', reelNo: '$items.reelNo' },
              rate: { $first: '$items.rate' },
              rateOn: { $first: '$items.rateOn' },
              qty: { $first: '$items.qty' },
              weight: { $first: '$items.weight' },
              value: { $first: '$items.value' },
              date: { $first: '$date' },
            } },
        ]).exec();
        for (const r of agg as any[]) {
          const key = `${r._id.store}||${r._id.product}||${r._id.reelNo || '-'}`;
          latestByKey.set(key, r);
        }
      } else {
        // WAC: weight-average per product/store/lot; if lot missing in purchases fallback to product/store level
        const wacAgg = await PurchaseInvoice.aggregate([
          { $unwind: '$items' },
          { $match: {
              date: { $lte: toDate },
              'items.store': { $in: storeNames },
              'items.product': { $in: productItems },
            } },
          { $project: {
              store: '$items.store',
              product: '$items.product',
              reelNo: { $ifNull: ['$items.reelNo', '-'] },
              qty: { $ifNull: ['$items.qty', 0] },
              weight: { $ifNull: ['$items.weight', 0] },
              rate: { $ifNull: ['$items.rate', 0] },
              rateOn: { $ifNull: ['$items.rateOn', 'Weight'] },
              value: { $ifNull: ['$items.value', 0] },
            } },
          // Normalize value: if not provided, compute from rate/rateOn
          { $addFields: {
              _valueNorm: {
                $cond: [
                  { $gt: ['$value', 0] },
                  '$value',
                  {
                    $cond: [
                      { $eq: ['$rateOn', 'Quantity'] },
                      { $multiply: [{ $ifNull: ['$rate', 0] }, { $ifNull: ['$qty', 0] }] },
                      { $multiply: [{ $ifNull: ['$rate', 0] }, { $ifNull: ['$weight', 0] }] },
                    ],
                  },
                ],
              },
            } },
          { $group: {
              _id: { store: '$store', product: '$product', reelNo: '$reelNo' },
              totalQty: { $sum: { $ifNull: ['$qty', 0] } },
              totalWeight: { $sum: { $ifNull: ['$weight', 0] } },
              totalValue: { $sum: '$_valueNorm' },
            } },
        ]).exec();
        for (const r of wacAgg as any[]) {
          const key = `${r._id.store}||${r._id.product}||${r._id.reelNo || '-'}`;
          latestByKey.set(key, { _wacQty: r.totalQty || 0, _wacWeight: r.totalWeight || 0, _wacValue: r.totalValue || 0 });
        }
      }
    }

    const rows = stocks
      .map((s: any) => {
        const p = pById.get(String(s.productId)) || {};
        const st = sById.get(String(s.storeId)) || {};
        const item = p.item || 'N/A';
        const storeName = st.store || 'N/A';
        const lot = s.reelNo || '-';
        const qty = Number(s.quantityPkts || 0);
        const weight = Number(s.weightKg || 0);

        // Estimate unit cost using selected mode
        let unitCost = 0; // cost per selected basis
        const ratioWPerQ = qty > 0 && weight > 0 ? (weight / qty) : 0; // kg per qty from current stock snapshot
        const keyExact = `${storeName}||${item}||${lot}`;
        const keyFallback = `${storeName}||${item}||-`;
        const info = latestByKey.get(keyExact) || latestByKey.get(keyFallback);
        if (info) {
          if (costMode === 'wac') {
            const q = Number(info._wacQty || 0);
            const w = Number(info._wacWeight || 0);
            const v = Number(info._wacValue || 0);
            const perKg = (w > 0 && v > 0) ? (v / w) : undefined;
            const perQty = (q > 0 && v > 0) ? (v / q) : undefined;
            if (basis === 'weight') {
              unitCost = perKg ?? (perQty && ratioWPerQ > 0 ? perQty * (q > 0 ? (w > 0 ? (q / w) : 0) : (1 / ratioWPerQ)) : 0);
              // simplify conversion: perQty -> perKg = perQty * (qty/weight); if w==0, use stock ratio
              if (!perKg && perQty && ratioWPerQ > 0) unitCost = perQty * (1 / ratioWPerQ);
            } else {
              unitCost = perQty ?? (perKg && ratioWPerQ > 0 ? perKg * ratioWPerQ : 0);
            }
          } else {
            const rate = Number(info.rate || 0);
            const rateOn = String(info.rateOn || 'Weight');
            const latestQty = Number(info.qty || 0);
            const latestWeight = Number(info.weight || 0);
            const latestValue = Number(info.value || 0);
            const perKgFromLatest = (() => {
              if (rateOn === 'Weight' && rate > 0) return rate;
              if (latestValue > 0 && latestWeight > 0) return latestValue / latestWeight;
              if (rateOn === 'Quantity' && rate > 0 && latestQty > 0 && latestWeight > 0) return rate * (latestQty / latestWeight);
              return undefined;
            })();
            const perQtyFromLatest = (() => {
              if (rateOn === 'Quantity' && rate > 0) return rate;
              if (latestValue > 0 && latestQty > 0) return latestValue / latestQty;
              if (rateOn === 'Weight' && rate > 0 && latestQty > 0 && latestWeight > 0) return rate * (latestWeight / latestQty);
              return undefined;
            })();
            if (basis === 'weight') {
              unitCost = (perKgFromLatest != null ? perKgFromLatest : (perQtyFromLatest != null && ratioWPerQ > 0 ? perQtyFromLatest * (1 / ratioWPerQ) : 0));
            } else {
              unitCost = (perQtyFromLatest != null ? perQtyFromLatest : (perKgFromLatest != null && ratioWPerQ > 0 ? perKgFromLatest * ratioWPerQ : 0));
            }
          }
        }
        if (!unitCost) {
          const fallbackPerQty = Number(p.costRateQty || 0);
          if (fallbackPerQty > 0) {
            if (basis === 'weight' && qty > 0 && weight > 0) {
              unitCost = fallbackPerQty * (qty / weight);
            } else if (basis === 'qty') {
              unitCost = fallbackPerQty;
            }
          }
        }

        const totalValue = +(((basis === 'weight' ? weight : qty) * unitCost) || 0).toFixed(2);
        return {
          product: item,
          store: storeName,
          lot,
          quantity: qty,
          weight,
          unitCost,
          totalValue,
        };
      })
      .sort((a, b) => a.product.localeCompare(b.product) || a.store.localeCompare(b.store));

  // Pagination
  const total = rows.length;
  const start = (page - 1) * limit;
  const paged = rows.slice(start, start + limit);
  const hasMore = page * limit < total;

  // Server-side totals across full query
  const totals = rows.reduce((acc, r) => {
    acc.quantity += Number(r.quantity || 0);
    acc.weight += Number(r.weight || 0);
    acc.totalValue += Number(r.totalValue || 0);
    return acc;
  }, { quantity: 0, weight: 0, totalValue: 0 });

  return NextResponse.json({ rows: paged, pagination: { page, limit, total, hasMore }, totals });
  } catch (error: any) {
    console.error('inventory-valuation-detailed failed:', error);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
