import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Store from '@/models/Store';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query: any = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const stores = await Store.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ store: 1 });

    const total = await Store.countDocuments(query);
    const hasMore = page * limit < total;

    return NextResponse.json({ stores, pagination: { hasMore } });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    if (!body.store) {
      return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
    }

    const store = await Store.create(body);
    return NextResponse.json(store, { status: 201 });
  } catch (error: any) {
    console.error('Error creating store:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: msgs.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Store name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}