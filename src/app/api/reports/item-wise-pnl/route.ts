import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import Product from '@/models/Product';

// Item-wise Profit & Loss
// - Aggregates sales by product within a date range (and optional product/store filters)
// - Revenue: sum of item values (fallback to rate * qty/weight)
// - Cost: WAC per kg from purchases up to 'to' date (scoped by store when provided) times sold weight
//         Fallback: Product.costRateQty * unitsSold (when WAC not available)
// Returns rows: { product, unitsSold, salesRevenue, cost, profit, margin }
export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const from = (searchParams.get('from') || '').trim();
    const to = (searchParams.get('to') || '').trim();
    const product = (searchParams.get('product') || '').trim();
    const store = (searchParams.get('store') || '').trim();

    // Date filter for invoices
    const invMatch: any = {};
    if (from || to) {
      invMatch.date = {} as any;
      if (from) invMatch.date.$gte = new Date(from);
      if (to) invMatch.date.$lte = new Date(to + 'T23:59:59.999Z');
    }

    // Item-level filters
    const andItems: any[] = [];
    if (product) andItems.push({ 'items.product': new RegExp(product, 'i') });
    if (store && store !== 'All Stores') andItems.push({ 'items.store': store });

    // Aggregate sales by product
    const salesAgg = await SaleInvoice.aggregate([
      { $match: invMatch },
      { $unwind: '$items' },
      ...(andItems.length ? [{ $match: { $and: andItems } }] : []),
      { $project: {
          product: '$items.product',
          pkt: { $ifNull: ['$items.pkt', 0] },
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
                  { $multiply: [{ $ifNull: ['$rate', 0] }, { $ifNull: ['$pkt', 0] }] },
                  { $multiply: [{ $ifNull: ['$rate', 0] }, { $ifNull: ['$weight', 0] }] },
                ],
              },
            ],
          },
        } },
      { $group: {
          _id: '$product',
          unitsSold: { $sum: { $ifNull: ['$pkt', 0] } },
          totalWeight: { $sum: { $ifNull: ['$weight', 0] } },
          salesRevenue: { $sum: '$_valueNorm' },
        } },
    ]).exec();

    if (!salesAgg?.length) {
      return NextResponse.json({ rows: [] });
    }

    // Prepare list of products to compute WAC from purchases
    const prodCodes: string[] = salesAgg.map((r: any) => r._id).filter(Boolean);
    const toDate = to ? new Date(to + 'T23:59:59.999Z') : new Date('9999-12-31T23:59:59.999Z');

    const purMatch: any = { date: { $lte: toDate } };
    const purItemMatch: any[] = [ { 'items.product': { $in: prodCodes } } ];
    if (store && store !== 'All Stores') purItemMatch.push({ 'items.store': store });

    const wacAgg = await PurchaseInvoice.aggregate([
      { $match: purMatch },
      { $unwind: '$items' },
      { $match: { $and: purItemMatch } },
      { $project: {
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
          _id: '$product',
          totalWeight: { $sum: { $ifNull: ['$weight', 0] } },
          totalValue: { $sum: '$_valueNorm' },
        } },
    ]).exec();

    const wacByProduct = new Map<string, { perKg: number }>();
    for (const r of wacAgg as any[]) {
      const tw = Number(r.totalWeight || 0);
      const tv = Number(r.totalValue || 0);
      const perKg = tw > 0 ? tv / tw : 0;
      if (perKg > 0) wacByProduct.set(String(r._id), { perKg });
    }

    // Fallback per-qty cost from Product if WAC unavailable
    const prodDocs = await Product.find({ item: { $in: prodCodes } }, { item: 1, costRateQty: 1 }).lean();
    const costQtyByItem = new Map<string, number>(prodDocs.map((p: any) => [p.item, Number(p.costRateQty || 0)]));

    const rows = (salesAgg as any[]).map((r) => {
      const code = String(r._id);
      const unitsSold = Number(r.unitsSold || 0);
      const totalWeight = Number(r.totalWeight || 0);
      const salesRevenue = Number(r.salesRevenue || 0);
      const wac = wacByProduct.get(code)?.perKg || 0;
      let cost = 0;
      if (wac > 0 && totalWeight > 0) {
        cost = wac * totalWeight;
      } else {
        const costPerQty = costQtyByItem.get(code) || 0;
        if (costPerQty > 0 && unitsSold > 0) cost = costPerQty * unitsSold;
      }
      const profit = salesRevenue - cost;
      const margin = salesRevenue > 0 ? (profit / salesRevenue) * 100 : 0;
      return {
        product: code,
        unitsSold: Math.round(unitsSold),
        salesRevenue: Math.round(salesRevenue),
        cost: Math.round(cost),
        profit: Math.round(profit),
        margin,
      };
    }).sort((a, b) => b.profit - a.profit);

    return NextResponse.json({ rows });
  } catch (err) {
    console.error('item-wise-pnl failed:', err);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
