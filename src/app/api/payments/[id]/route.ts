import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const doc = await Payment.findById(id);
    if (!doc) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const body = await request.json();
    if (typeof body.date === 'string') body.date = new Date(body.date);
    if (body.amount != null) body.amount = Number(body.amount) || 0;
    const { id } = await ctx.params;
    const updated = await Payment.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const deleted = await Payment.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    return NextResponse.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
