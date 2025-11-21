import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import SaleReturn from '@/models/SaleReturn';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const q = searchParams.get('q');

    const query: any = {};
    if (q) {
      query.$or = [
        { returnNumber: { $regex: q, $options: 'i' } },
        { originalInvoiceNumber: { $regex: q, $options: 'i' } },
        { customer: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const data = await SaleReturn.find(query).sort({ date: -1 }).skip(skip).limit(limit);
    const total = await SaleReturn.countDocuments(query);

    return NextResponse.json({ 
      returns: data, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    console.error('Error fetching sale returns:', error);
    return NextResponse.json({ error: 'Failed to fetch sale returns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.date) body.date = new Date();
    if (typeof body.date === 'string') body.date = new Date(body.date);
    
    if (!body.customer) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }
    
    if (!body.originalInvoiceNumber) {
      return NextResponse.json({ error: 'Original invoice number is required' }, { status: 400 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Calculate totals
    body.totalAmount = body.items.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    body.netAmount = body.totalAmount;

    const created = await SaleReturn.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sale return:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: msgs.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Duplicate return number' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create sale return' }, { status: 500 });
  }
}
