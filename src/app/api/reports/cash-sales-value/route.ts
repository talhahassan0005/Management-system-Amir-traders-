import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';

// Cash Sales Value report
// Returns list of cash sale invoices with optional filters: from, to, customer, product, store
export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
  const customer = searchParams.get('customer') || '';
  const product = searchParams.get('product') || '';
  const store = searchParams.get('store') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

    // Base query: only Cash sales
  // This endpoint is specifically for Cash sales
  const query: any = { paymentType: 'Cash' };

    // Date range
    if (from || to) {
      query.date = {} as any;
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    // Customer contains text (case-insensitive)
    if (customer) query.customer = new RegExp(customer, 'i');

    // Product/Store filter based on items array
    const andItems: any[] = [];
    if (product) andItems.push({ 'items.product': new RegExp(product, 'i') });
    if (store && store !== 'All Stores') andItems.push({ 'items.store': store });
    if (andItems.length) query.$and = andItems;

    const invoices = await SaleInvoice.find(query)
      .select('invoiceNumber customer date netAmount paymentType')
      .sort({ date: -1, invoiceNumber: -1 })
      .lean();

    const rows = invoices.map((inv: any) => ({
      date: inv?.date ? new Date(inv.date).toISOString().slice(0, 10) : '-',
      invoiceNo: inv?.invoiceNumber || '-',
      customer: inv?.customer || '-',
      amount: Number(inv?.netAmount || 0),
    }));

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Error fetching cash sales:', error);
    return NextResponse.json({ rows: [] });
  }
}
