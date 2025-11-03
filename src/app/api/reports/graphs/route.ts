import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';
import Product from '@/models/Product';

// Graphs & Analytics API backed by real DB data
// Filters: from, to (dates); customer (text); product (text on item code/description); store (exact store name)
export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const from = (searchParams.get('from') || '').trim();
    const to = (searchParams.get('to') || '').trim();
    const customer = (searchParams.get('customer') || '').trim();
    const product = (searchParams.get('product') || '').trim();
    const store = (searchParams.get('store') || '').trim();

    // Build base match for invoices
    const invMatch: any = {};
    if (from || to) {
      invMatch.date = {} as any;
      if (from) invMatch.date.$gte = new Date(from);
      if (to) invMatch.date.$lte = new Date(to + 'T23:59:59.999Z');
    }
    if (customer) invMatch.customer = new RegExp(customer, 'i');

    // If product/store filters present, compute from items; otherwise from invoice totals
    const useItems = !!(product || (store && store !== 'All Stores'));

    // Helper to build month label
    const monthName = (y: number, m: number) => {
      const d = new Date(Date.UTC(y, m - 1, 1));
      return d.toLocaleString('en', { month: 'short' });
    };

    // BAR/LINE: sales by month
    let monthly: Array<{ _id: { year: number; month: number }; total: number }>; 
    if (useItems) {
      const andItems: any[] = [];
      if (product) andItems.push({ 'items.product': new RegExp(product, 'i') });
      if (store && store !== 'All Stores') andItems.push({ 'items.store': store });

      monthly = await SaleInvoice.aggregate([
        { $match: invMatch },
        { $unwind: '$items' },
        ...(andItems.length ? [{ $match: { $and: andItems } }] : []),
        { $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: { $ifNull: ['$items.value', 0] } },
        } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]).exec();
    } else {
      monthly = await SaleInvoice.aggregate([
        { $match: invMatch },
        { $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: { $ifNull: ['$netAmount', 0] } },
        } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]).exec();
    }

    const bar = monthly.map((m: any) => ({ name: monthName(m._id.year, m._id.month), value: Number(m.total || 0) }));
    const line = bar.map((b) => ({ ...b }));

    // PIE: category distribution by product category from items
    const itemMatch: any[] = [];
    if (product) itemMatch.push({ 'items.product': new RegExp(product, 'i') });
    if (store && store !== 'All Stores') itemMatch.push({ 'items.store': store });

    const totalsByProduct = await SaleInvoice.aggregate([
      { $match: invMatch },
      { $unwind: '$items' },
      ...(itemMatch.length ? [{ $match: { $and: itemMatch } }] : []),
      { $group: {
        _id: '$items.product',
        value: { $sum: { $ifNull: ['$items.value', 0] } },
      } },
    ]).exec();

    const productCodes = totalsByProduct.map((r: any) => r._id).filter(Boolean);
    const prodDocs = productCodes.length ? await Product.find({ item: { $in: productCodes } }, { item: 1, category: 1 }).lean() : [];
    const catByItem = new Map<string, string>(prodDocs.map((p: any) => [p.item, p.category || 'Uncategorized']));

    const catTotals = new Map<string, number>();
    for (const r of totalsByProduct as any[]) {
      const cat = catByItem.get(r._id) || 'Uncategorized';
      const prev = catTotals.get(cat) || 0;
      catTotals.set(cat, prev + Number(r.value || 0));
    }
    const pie = Array.from(catTotals.entries()).map(([name, value]) => ({ name, value }));

    return NextResponse.json({ bar, line, pie });
  } catch (err) {
    console.error('graphs report failed:', err);
    return NextResponse.json({ bar: [], line: [], pie: [] }, { status: 500 });
  }
}
