import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Stock from '@/models/Stock';
import Product from '@/models/Product';
import Store from '@/models/Store';

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const productFilter = (searchParams.get('product') || '').trim();
    const storeFilter = (searchParams.get('store') || '').trim();
    const costMode: 'latest' | 'wac' = ((searchParams.get('cost') || 'latest').toLowerCase() === 'wac') ? 'wac' : 'latest';
    const basis: 'qty' | 'weight' = ((searchParams.get('basis') || 'qty').toLowerCase() === 'weight') ? 'weight' : 'qty';
    const toParam = (searchParams.get('to') || '').trim();
    const toDate = toParam ? new Date(toParam + 'T23:59:59.999Z') : new Date();

    // Resolve product/store filters to IDs (Stock stores string IDs, not refs)
    let productIds: string[] | undefined;
    if (productFilter) {
      const prods = await Product.find({
        $or: [
          { item: new RegExp(productFilter, 'i') },
          { description: new RegExp(productFilter, 'i') },
        ],
      }, { _id: 1 }).lean();
      productIds = prods.map((p: any) => String(p._id));
      if (productIds.length === 0) return NextResponse.json({ rows: [] });
    }

    let storeIds: string[] | undefined;
    if (storeFilter) {
      const stores = await Store.find({ store: new RegExp(`^${storeFilter}$`, 'i') }, { _id: 1 }).lean();
      storeIds = stores.map((s: any) => String(s._id));
      if (storeIds.length === 0) return NextResponse.json({ rows: [] });
    }

    const query: any = {};
    if (productIds) query.productId = { $in: productIds };
    if (storeIds) query.storeId = { $in: storeIds };

    const stocks = await Stock.find(query).lean();

    if (!stocks?.length) return NextResponse.json({ rows: [] });

    // Fetch product info for display
    const pIds = Array.from(new Set(stocks.map((s: any) => String(s.productId))));
    const sIds = Array.from(new Set(stocks.map((s: any) => String(s.storeId))));
    const [products, stores] = await Promise.all([
      Product.find({ _id: { $in: pIds } }, { item: 1, costRateQty: 1 }).lean(),
      Store.find({ _id: { $in: sIds } }, { store: 1 }).lean(),
    ]);
    const pById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));
    const sById = new Map<string, any>(stores.map((s: any) => [String(s._id), s]));

    // Build costing map from purchases up to toDate
    const PurchaseInvoice = (await import('@/models/PurchaseInvoice')).default;
    const storeNames = sIds.map((id) => (sById.get(id)?.store || '')).filter(Boolean);
    const productItems = pIds.map((id) => (pById.get(id)?.item || '')).filter(Boolean);
    type Key = string;
    const costMap = new Map<Key, any>(); // key: store||product
    if (storeNames.length && productItems.length) {
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
              _id: { store: '$items.store', product: '$items.product' },
              rate: { $first: '$items.rate' },
              rateOn: { $first: '$items.rateOn' },
              qty: { $first: '$items.qty' },
              weight: { $first: '$items.weight' },
              value: { $first: '$items.value' },
              date: { $first: '$date' },
            } },
        ]).exec();
        for (const r of agg as any[]) {
          const key = `${r._id.store}||${r._id.product}`;
          costMap.set(key, r);
        }
      } else {
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
                      { $multiply: [{ $ifNull: ['$rate', 0] }, { $ifNull: ['$qty', 0] }] },
                      { $multiply: [{ $ifNull: ['$rate', 0] }, { $ifNull: ['$weight', 0] }] },
                    ],
                  },
                ],
              },
            } },
          { $group: {
              _id: { store: '$store', product: '$product' },
              totalQty: { $sum: { $ifNull: ['$qty', 0] } },
              totalWeight: { $sum: { $ifNull: ['$weight', 0] } },
              totalValue: { $sum: '$_valueNorm' },
            } },
        ]).exec();
        for (const r of wacAgg as any[]) {
          const key = `${r._id.store}||${r._id.product}`;
          costMap.set(key, { _wacQty: r.totalQty || 0, _wacWeight: r.totalWeight || 0, _wacValue: r.totalValue || 0 });
        }
      }
    }

    const rows = stocks
      .map((s: any) => {
        const p = pById.get(String(s.productId)) || {};
        const st = sById.get(String(s.storeId)) || {};
        const item = p.item || 'N/A';
        const storeName = st.store || 'N/A';
        const qty = Number(s.quantityPkts || 0);
        const weight = Number(s.weightKg || 0);

        let unitCost = 0;
        const key = `${storeName}||${item}`;
        const info = costMap.get(key);
        if (info) {
          if (costMode === 'wac') {
            const q = Number(info._wacQty || 0);
            const w = Number(info._wacWeight || 0);
            const v = Number(info._wacValue || 0);
            if (basis === 'weight') {
              if (w > 0 && v > 0) unitCost = v / w; else unitCost = 0;
            } else {
              if (q > 0 && v > 0) unitCost = v / q; else unitCost = 0;
            }
          } else {
            const rate = Number(info.rate || 0);
            const rateOn = String(info.rateOn || 'Weight');
            const latestQty = Number(info.qty || 0);
            const latestWeight = Number(info.weight || 0);
            const latestValue = Number(info.value || 0);
            if (basis === 'weight') {
              if (rateOn === 'Weight' && rate > 0) unitCost = rate;
              else if (rateOn === 'Quantity' && rate > 0 && latestQty > 0 && latestWeight > 0) unitCost = rate * (latestQty / latestWeight);
              else if (latestValue > 0 && latestWeight > 0) unitCost = latestValue / latestWeight;
            } else {
              if (rateOn === 'Quantity' && rate > 0) unitCost = rate;
              else if (rateOn === 'Weight' && rate > 0 && latestQty > 0 && latestWeight > 0) unitCost = rate * (latestWeight / latestQty);
              else if (latestValue > 0 && latestQty > 0) unitCost = latestValue / latestQty;
            }
          }
        }
        if (!unitCost) {
          const fallbackPerQty = Number(p.costRateQty || 0);
          if (fallbackPerQty > 0) {
            if (basis === 'weight' && qty > 0 && weight > 0) unitCost = fallbackPerQty * (qty / weight);
            else if (basis === 'qty') unitCost = fallbackPerQty;
          }
        }

        const totalValue = +(((basis === 'weight' ? weight : qty) * unitCost) || 0).toFixed(2);
        return {
          item,
          qty,
          unitCost,
          value: totalValue,
        };
      })
      .sort((a, b) => a.item.localeCompare(b.item));
    
  return NextResponse.json({ rows });
  } catch (error) {
    console.error('Error fetching inventory valuation:', error);
    return NextResponse.json({ rows: [] });
  }
}
