import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import PurchaseInvoice from '@/models/PurchaseInvoice';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: any = {};
    if (from || to) {
      query.date = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        query.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.date.$lte = toDate;
      }
    }

    const skip = (page - 1) * limit;
    const invoices = await PurchaseInvoice.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PurchaseInvoice.countDocuments(query);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching purchase invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    if (body.date && typeof body.date === 'string') {
      body.date = new Date(body.date);
    }
    if (!body.date) {
      body.date = new Date();
    }

    // Basic server-side validation
    if (!body.paymentType || !['Cash', 'Credit'].includes(body.paymentType)) {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Filter + validate items: require product and at least qty or weight > 0
    const cleanedItems: any[] = [];
    const itemErrors: string[] = [];
    body.items.forEach((raw: any, idx: number) => {
      const item = {
        store: (raw.store || '').trim(),
        product: (raw.product || '').trim(),
        qty: Number(raw.qty || 0),
        weight: Number(raw.weight || 0),
        brand: raw.brand || '',
        width: Number(raw.width || 0),
        length: Number(raw.length || 0),
        remarks: raw.remarks || '',
        reelNo: raw.reelNo || '',
        description: raw.description || '',
        grams: Number(raw.grams || 0),
        packing: Number(raw.packing || 0),
        rate: Number(raw.rate || 0),
        rateOn: (raw.rateOn === 'Quantity') ? 'Quantity' : 'Weight',
        value: (() => {
          const has = typeof raw.value === 'number' && !Number.isNaN(raw.value);
          if (has) return Number(raw.value);
          const rate = Number(raw.rate || 0);
          return (raw.rateOn === 'Quantity') ? (rate * Number(raw.qty || 0)) : (rate * Number(raw.weight || 0));
        })(),
      } as any;
      if (!item.product) {
        itemErrors.push(`Row ${idx + 1}: product is required`);
        return;
      }
      if ((item.qty ?? 0) <= 0 && (item.weight ?? 0) <= 0) {
        itemErrors.push(`Row ${idx + 1}: provide qty or weight > 0`);
        return;
      }
      cleanedItems.push(item);
    });

    if (itemErrors.length > 0) {
      return NextResponse.json({ error: itemErrors.join(', ') }, { status: 400 });
    }
    if (cleanedItems.length === 0) {
      return NextResponse.json({ error: 'Please provide at least one valid item' }, { status: 400 });
    }
    body.items = cleanedItems;

    // Default numerics
    body.totalAmount = Number(body.totalAmount || 0);
    body.discount = Number(body.discount || 0);
    body.freight = Number(body.freight || 0);
    body.weight = Number(body.weight || 0);

    // Ensure invoiceNumber exists (generate server-side if missing or blank)
    if (!body.invoiceNumber || String(body.invoiceNumber).trim().length === 0) {
      const count = await PurchaseInvoice.countDocuments();
      body.invoiceNumber = `PI-${String(count + 1).padStart(6, '0')}`;
    }

    const invoice = new PurchaseInvoice(body);
    const saved = await invoice.save();
    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    console.error('Error creating purchase invoice:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Invoice number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create purchase invoice', details: error.message },
      { status: 500 }
    );
  }
}
