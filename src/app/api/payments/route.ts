import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const partyType = searchParams.get('partyType');
    const q = searchParams.get('q');

    const query: any = {};
    if (partyType) query.partyType = partyType;
    if (q) {
      query.$or = [
        { voucherNumber: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const data = await Payment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Payment.countDocuments(query);

    // Enrich with party names for client display
    const customerIds: string[] = [];
    const supplierIds: string[] = [];
    for (const p of data as any[]) {
      if (p.partyType === 'Customer') customerIds.push(p.partyId);
      else if (p.partyType === 'Supplier') supplierIds.push(p.partyId);
    }

    const [customerDocs, supplierDocs] = await Promise.all([
      customerIds.length ? Customer.find({ _id: { $in: customerIds } }).select('description').lean() : Promise.resolve([]),
      supplierIds.length ? Supplier.find({ _id: { $in: supplierIds } }).select('description business code').lean() : Promise.resolve([]),
    ] as any);

    const customerById = new Map<string, any>();
    for (const c of customerDocs as any[]) customerById.set(String(c._id), c);
    const supplierById = new Map<string, any>();
    const supplierByCode = new Map<string, any>();
    for (const s of supplierDocs as any[]) {
      supplierById.set(String(s._id), s);
      if (s.code) supplierByCode.set(String(s.code), s);
    }

    const enriched = (data as any[]).map((p) => {
      const obj = p.toObject ? p.toObject() : p;
      if (obj.partyType === 'Customer') {
        const c = customerById.get(String(obj.partyId));
        obj.partyTitle = c?.description || undefined;
      } else if (obj.partyType === 'Supplier') {
        let s = supplierById.get(String(obj.partyId));
        if (!s) s = supplierByCode.get(String(obj.partyId)); // fallback if partyId stored as code
        obj.partyTitle = s?.description || undefined;
        obj.partyBusiness = s?.business || undefined;
      }
      return obj;
    });

    return NextResponse.json({ payments: enriched, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    if (!body.date) body.date = new Date();
    if (typeof body.date === 'string') body.date = new Date(body.date);
    body.amount = Number(body.amount || 0);

    if (!body.voucherNumber || String(body.voucherNumber).trim().length === 0) {
      const count = await Payment.countDocuments();
      body.voucherNumber = `PM-${String(count + 1).padStart(6, '0')}`;
    }

    const created = await Payment.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: msgs.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Duplicate voucher number' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
