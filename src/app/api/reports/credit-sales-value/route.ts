import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';

// Credit Sales Value report
export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const customer = searchParams.get('customer') || '';
    const product = searchParams.get('product') || '';
    const store = searchParams.get('store') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const query: any = { paymentType: 'Credit' };

    if (from || to) {
      query.date = {} as any;
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    if (customer) query.customer = new RegExp(customer, 'i');

    const andItems: any[] = [];
    if (product) andItems.push({ 'items.product': new RegExp(product, 'i') });
    if (store && store !== 'All Stores') andItems.push({ 'items.store': store });
    if (andItems.length) query.$and = andItems;

    const invoices = await SaleInvoice.find(query)
      .select('invoiceNumber customer date netAmount balance')
      .sort({ date: -1, invoiceNumber: -1 })
      .lean();

    const rows = invoices.map((inv: any) => ({
      date: inv?.date ? new Date(inv.date).toISOString().slice(0, 10) : '-',
      invoiceNo: inv?.invoiceNumber || '-',
      customer: inv?.customer || '-',
      amount: Number(inv?.netAmount || 0),
      balance: Number(inv?.balance || 0),
    }));

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Error fetching credit sales:', error);
    return NextResponse.json({ rows: [] });
  }
}
