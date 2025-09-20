import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Receipt from '@/models/Receipt';

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
    if (q) query.$or = [{ receiptNumber: { $regex: q, $options: 'i' } }, { notes: { $regex: q, $options: 'i' } }];

    const skip = (page - 1) * limit;
    const data = await Receipt.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Receipt.countDocuments(query);
    return NextResponse.json({ receipts: data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    if (!body.date) body.date = new Date();
    if (typeof body.date === 'string') body.date = new Date(body.date);
    body.amount = Number(body.amount || 0);

    if (!body.receiptNumber || String(body.receiptNumber).trim().length === 0) {
      const count = await Receipt.countDocuments();
      body.receiptNumber = `RC-${String(count + 1).padStart(6, '0')}`;
    }

    const created = await Receipt.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating receipt:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: msgs.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Duplicate receipt number' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create receipt' }, { status: 500 });
  }
}
