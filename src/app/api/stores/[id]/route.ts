import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Store from '@/models/Store';

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = await ctx.params;
    const doc = await Store.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!doc) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update store' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const doc = await Store.findByIdAndDelete(id);
    if (!doc) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete store' }, { status: 500 });
  }
}


