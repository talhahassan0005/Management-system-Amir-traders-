import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import Product from '@/models/Product';

// Customer-wise Profits
// Filters: from, to, store (exact), customer (substring)
// Output: [{ customer, totalSales, totalProfit, avgMargin, orders }]
export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const from = (searchParams.get('from') || '').trim();
    const to = (searchParams.get('to') || '').trim();
    const store = (searchParams.get('store') || '').trim();
    const customerFilter = (searchParams.get('customer') || '').trim();

    const invMatch: any = {};
    if (from || to) {
      invMatch.date = {} as any;
      if (from) invMatch.date.$gte = new Date(from);
      if (to) invMatch.date.$lte = new Date(to + 'T23:59:59.999Z');
    }
    if (customerFilter) invMatch.customer = new RegExp(customerFilter, 'i');

    const andItems: any[] = [];
    if (store && store !== 'All Stores') andItems.push({ 'items.store': store });

  // 1) Aggregate sales by customer+product, capture invoices set
    const salesAgg = await SaleInvoice.aggregate([
      { $match: invMatch },
      { $unwind: '$items' },
      ...(andItems.length ? [{ $match: { $and: andItems } }] : []),
      { $project: {
          customer: '$customer',
          invoiceNumber: '$invoiceNumber',
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
          _id: { customer: '$customer', product: '$product' },
          units: { $sum: { $ifNull: ['$pkt', 0] } },
          weight: { $sum: { $ifNull: ['$weight', 0] } },
          revenue: { $sum: '$_valueNorm' },
          invoices: { $addToSet: '$invoiceNumber' },
        } },
    ]).exec();

    if (!salesAgg?.length) return NextResponse.json({ rows: [] });

    // 2) Compute WAC per kg for products up to 'to' and optional store filter
    const products = Array.from(new Set(salesAgg.map((r: any) => r._id.product).filter(Boolean)));
    const toDate = to ? new Date(to + 'T23:59:59.999Z') : new Date('9999-12-31T23:59:59.999Z');
    const purMatch: any = { date: { $lte: toDate } };
    const purItemMatch: any[] = [ { 'items.product': { $in: products } } ];
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
          totalQty: { $sum: { $ifNull: ['$qty', 0] } },
          totalWeight: { $sum: { $ifNull: ['$weight', 0] } },
          totalValue: { $sum: '$_valueNorm' },
        } },
    ]).exec();

    const wacByProduct = new Map<string, { perQty: number; perKg: number }>();
    for (const r of wacAgg as any[]) {
      const tq = Number(r.totalQty || 0);
      const tw = Number(r.totalWeight || 0);
      const tv = Number(r.totalValue || 0);
      const perQty = tq > 0 && tv > 0 ? tv / tq : 0;
      const perKg = tw > 0 && tv > 0 ? tv / tw : 0;
      if (perQty > 0 || perKg > 0) wacByProduct.set(String(r._id), { perQty, perKg });
    }

    // 3) Fallback per-qty cost from Product
    const prodDocs = await Product.find({ item: { $in: products } }, { item: 1, costRateQty: 1 }).lean();
    const costQtyByItem = new Map<string, number>(prodDocs.map((p: any) => [p.item, Number(p.costRateQty || 0)]));

    // 4) Compute per customer totals and per-product details
    interface Totals { sales: number; cost: number; invoices: Set<string>; }
    const byCustomer = new Map<string, Totals>();
    for (const row of salesAgg as any[]) {
      const cust = String(row._id.customer || 'Unknown');
      const prod = String(row._id.product || '');
      const units = Number(row.units || 0);
      const weight = Number(row.weight || 0);
      const revenue = Number(row.revenue || 0);
      const per = wacByProduct.get(prod) || { perQty: 0, perKg: 0 };
      const perQtyFallback = costQtyByItem.get(prod) || 0;
      let cost = 0;
      if (per.perQty > 0 && units > 0) cost = per.perQty * units;
      else if (per.perKg > 0 && weight > 0) cost = per.perKg * weight;
      else if (perQtyFallback > 0 && units > 0) cost = perQtyFallback * units;

      const t = byCustomer.get(cust) || { sales: 0, cost: 0, invoices: new Set<string>() };
      t.sales += revenue;
      t.cost += cost;
      for (const inv of (row.invoices || [])) t.invoices.add(String(inv));

      byCustomer.set(cust, t);
    }

    const rows = Array.from(byCustomer.entries()).map(([customer, t]) => {
      const totalSales = Math.round(t.sales);
      const totalProfit = Math.round(t.sales - t.cost);
      const avgMargin = totalSales > 0 ? ((t.sales - t.cost) / t.sales) * 100 : 0;
      const orders = t.invoices.size;
      return { customer, totalSales, totalProfit, avgMargin, orders };
    }).sort((a, b) => b.totalProfit - a.totalProfit);

    return NextResponse.json({ rows });
  } catch (err) {
    console.error('customer-wise-profits failed:', err);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
