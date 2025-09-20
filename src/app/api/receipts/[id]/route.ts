import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Receipt from '@/models/Receipt';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const doc = await Receipt.findById(id);
    if (!doc) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const body = await request.json();
    if (typeof body.date === 'string') body.date = new Date(body.date);
    if (body.amount != null) body.amount = Number(body.amount) || 0;
    const { id } = await ctx.params;
    const updated = await Receipt.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating receipt:', error);
    return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const deleted = await Receipt.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    return NextResponse.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 });
  }
}
