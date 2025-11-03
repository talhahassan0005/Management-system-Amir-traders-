import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/mongodb';
import Cheque from '@/models/Cheque';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const partyType = searchParams.get('partyType');
    const q = searchParams.get('q');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: any = {};
    if (status) query.status = status;
    if (partyType) query.partyType = partyType;
    if (q) query.$or = [{ chequeNo: { $regex: q, $options: 'i' } }, { bank: { $regex: q, $options: 'i' } }, { notes: { $regex: q, $options: 'i' } }];
    if (from || to) {
      query.dueDate = {};
      if (from) query.dueDate.$gte = new Date(from);
      if (to) query.dueDate.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;
    const data = await Cheque.find(query).sort({ dueDate: 1 }).skip(skip).limit(limit);
    const total = await Cheque.countDocuments(query);
    const hasMore = page * limit < total;
    return NextResponse.json({ cheques: data, pagination: { page, limit, total, pages: Math.ceil(total / limit), hasMore } });
  } catch (error) {
    console.error('Error fetching cheques:', error);
    return NextResponse.json({ error: 'Failed to fetch cheques' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    if (typeof body.issueDate === 'string') body.issueDate = new Date(body.issueDate);
    if (typeof body.dueDate === 'string') body.dueDate = new Date(body.dueDate);
    body.amount = Number(body.amount || 0);
    if (!body.chequeNumber || String(body.chequeNumber).trim().length === 0) {
      const count = await Cheque.countDocuments();
      body.chequeNumber = `CQ-${String(count + 1).padStart(6, '0')}`;
    }
    const created = await Cheque.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating cheque:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: msgs.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Duplicate cheque number' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create cheque' }, { status: 500 });
  }
}
