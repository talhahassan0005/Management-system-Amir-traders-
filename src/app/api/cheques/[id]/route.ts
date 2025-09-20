import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Cheque from '@/models/Cheque';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const doc = await Cheque.findById(id);
    if (!doc) return NextResponse.json({ error: 'Cheque not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    console.error('Error fetching cheque:', error);
    return NextResponse.json({ error: 'Failed to fetch cheque' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const body = await request.json();
    if (typeof body.issueDate === 'string') body.issueDate = new Date(body.issueDate);
    if (typeof body.dueDate === 'string') body.dueDate = new Date(body.dueDate);
    if (body.amount != null) body.amount = Number(body.amount) || 0;
    const updated = await Cheque.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Cheque not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating cheque:', error);
    return NextResponse.json({ error: 'Failed to update cheque' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const deleted = await Cheque.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Cheque not found' }, { status: 404 });
    return NextResponse.json({ message: 'Cheque deleted successfully' });
  } catch (error) {
    console.error('Error deleting cheque:', error);
    return NextResponse.json({ error: 'Failed to delete cheque' }, { status: 500 });
  }
}
