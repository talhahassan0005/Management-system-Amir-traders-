import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

// Lazy imports to avoid circulars during build
async function getModels() {
  const SaleInvoice = (await import('@/models/SaleInvoice')).default;
  const PurchaseInvoice = (await import('@/models/PurchaseInvoice')).default;
  return { SaleInvoice, PurchaseInvoice };
}

function parseDates(url: string) {
  const { searchParams } = new URL(url);
  const from = (searchParams.get('from') || '').trim();
  const to = (searchParams.get('to') || '').trim();
  const fromDate = from ? new Date(from + 'T00:00:00.000Z') : new Date('1970-01-01T00:00:00.000Z');
  const toDate = to ? new Date(to + 'T23:59:59.999Z') : new Date();
  return { fromDate, toDate };
}

function computeUnitWeight(p: any): number {
  if (!p) return 0;
  const length = Number(p.length || 0);
  const width = Number(p.width || 0);
  const grams = Number(p.grams || 0);
  const type = String(p.type || '').toLowerCase();
  if (!(length > 0 && width > 0 && grams > 0)) return 0;
  // Mirror the formula used on the sale page
  return type === 'board' ? (length * width * grams) / 15500 : length * width * grams;
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { fromDate, toDate } = parseDates(req.url);
    const { searchParams } = new URL(req.url);

    // Optional text filters (stored as strings in invoices)
    const productFilter = (searchParams.get('product') || '').trim();
    const storeFilter = (searchParams.get('store') || '').trim();
    const customerFilter = (searchParams.get('customer') || '').trim();

    const { SaleInvoice, PurchaseInvoice } = await getModels();

    // 1) Aggregate sales within period
    const saleMatch: any = { date: { $gte: fromDate, $lte: toDate } };
    if (customerFilter) saleMatch.customer = customerFilter;

    // When product/store filters are present, compute revenue from items; else use invoice.netAmount
    const useItemRevenue = !!(productFilter || storeFilter);

    let revenue = 0;
    let salesByGroup: Array<{ store: string; product: string; soldQty: number; soldWeight: number; itemRevenue: number; }>; // for COGS
    salesByGroup = [];

    if (useItemRevenue) {
      const agg = await SaleInvoice.aggregate([
        { $match: saleMatch },
        { $unwind: '$items' },
        ...(storeFilter ? [{ $match: { 'items.store': storeFilter } }] : []),
        ...(productFilter ? [{ $match: { 'items.product': productFilter } }] : []),
        { $group: {
          _id: { store: '$items.store', product: '$items.product' },
          soldQty: { $sum: { $ifNull: ['$items.pkt', 0] } },
          soldWeight: { $sum: { $ifNull: ['$items.weight', 0] } },
          itemRevenue: { $sum: { $ifNull: ['$items.value', 0] } },
        } },
      ]).exec();
      salesByGroup = (agg as any[]).map(r => ({
        store: r._id.store || '',
        product: r._id.product || '',
        soldQty: Number(r.soldQty || 0),
        soldWeight: Number(r.soldWeight || 0),
        itemRevenue: Number(r.itemRevenue || 0),
      }));
      revenue = salesByGroup.reduce((s, r) => s + r.itemRevenue, 0);
    } else {
      const invAgg = await SaleInvoice.aggregate([
        { $match: saleMatch },
        { $group: { _id: null, sum: { $sum: { $ifNull: ['$netAmount', 0] } } } },
      ]).exec();
      revenue = Number(invAgg?.[0]?.sum || 0);
      // Still compute sales by group for COGS (all products/stores in the period)
      const agg = await SaleInvoice.aggregate([
        { $match: saleMatch },
        { $unwind: '$items' },
        { $group: {
          _id: { store: '$items.store', product: '$items.product' },
          soldQty: { $sum: { $ifNull: ['$items.pkt', 0] } },
          soldWeight: { $sum: { $ifNull: ['$items.weight', 0] } },
          itemRevenue: { $sum: { $ifNull: ['$items.value', 0] } },
        } },
      ]).exec();
      salesByGroup = (agg as any[]).map(r => ({
        store: r._id.store || '',
        product: r._id.product || '',
        soldQty: Number(r.soldQty || 0),
        soldWeight: Number(r.soldWeight || 0),
        itemRevenue: Number(r.itemRevenue || 0),
      }));
    }

    if (salesByGroup.length === 0) {
      const zero = { revenue: 0, cogs: 0, grossProfit: 0, netProfit: 0 };
      return NextResponse.json(zero);
    }

    // 2) Build WAC cost map from purchases up to toDate for only the involved store+product pairs
    const stores = Array.from(new Set(salesByGroup.map(g => g.store).filter(Boolean)));
    const products = Array.from(new Set(salesByGroup.map(g => g.product).filter(Boolean)));

    // Preload products for unit-weight fallback/cross-basis conversion
    const prodDocs = await Product.find({ item: { $in: products } }, { item: 1, length: 1, width: 1, grams: 1, type: 1, costRateQty: 1 }).lean();
    const prodByItem = new Map<string, any>(prodDocs.map((p: any) => [String(p.item), p]));

    type Key = string; // `${store}||${product}`
    const wacMap = new Map<Key, { totalQty: number; totalWeight: number; totalValue: number }>();
    if (stores.length && products.length) {
      const wacAgg = await PurchaseInvoice.aggregate([
        { $unwind: '$items' },
        { $match: {
            date: { $lte: toDate },
            'items.store': { $in: stores },
            'items.product': { $in: products },
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
      for (const r of (wacAgg as any[])) {
        const key = `${r._id.store}||${r._id.product}`;
        wacMap.set(key, {
          totalQty: Number(r.totalQty || 0),
          totalWeight: Number(r.totalWeight || 0),
          totalValue: Number(r.totalValue || 0),
        });
      }
    }

    // 3) Compute COGS = sum(weightSold * costPerKg + qtySold * costPerPkt)
    let cogs = 0;
    for (const g of salesByGroup) {
      const key = `${g.store}||${g.product}`;
      const w = wacMap.get(key);
      const p = prodByItem.get(g.product);
      const unitWeight = computeUnitWeight(p);

      // derive perKg and perPkt cost using available data and safe fallbacks
      let perKg = 0;
      let perPkt = 0;
      if (w && w.totalValue > 0) {
        if (w.totalWeight > 0) perKg = w.totalValue / w.totalWeight;
        if (w.totalQty > 0) perPkt = w.totalValue / w.totalQty;
      }
      // cross-convert if one side missing and we know unitWeight
      if (!perPkt && perKg && unitWeight > 0) perPkt = perKg * unitWeight;
      if (!perKg && perPkt && unitWeight > 0) perKg = perPkt / unitWeight;

      // last-resort fallback from product default costRateQty (per quantity)
      if (!perPkt && p && Number(p.costRateQty) > 0) perPkt = Number(p.costRateQty);
      if (!perKg && perPkt && unitWeight > 0) perKg = perPkt / unitWeight;

      const costForGroup = (g.soldWeight * (perKg || 0)) + (g.soldQty * (perPkt || 0));
      cogs += costForGroup;
    }

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit; // No operating expenses model yet

    return NextResponse.json({
      revenue: +revenue.toFixed(2),
      cogs: +cogs.toFixed(2),
      grossProfit: +grossProfit.toFixed(2),
      netProfit: +netProfit.toFixed(2),
    });
  } catch (err) {
    console.error('Error building income statement:', err);
    return NextResponse.json({ revenue: 0, cogs: 0, grossProfit: 0, netProfit: 0 });
  }
}
